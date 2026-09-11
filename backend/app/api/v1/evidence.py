from datetime import datetime, timezone
import hashlib
import mimetypes
from pathlib import Path
import tempfile
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from app.api.v1.activity import log_activity
from app.api.v1.notifications import notify_affected_decisions
from app.core.database import get_db
from app.models.evidence import EvidenceRecord
from app.schemas import EvidenceObject, Provenance
from app.services.parsers import parse_evidence
from app.services.vector_store import index_evidence

router = APIRouter()


@router.post("/upload", response_model=EvidenceObject)
async def upload_evidence(
    request: Request,
    file: Optional[UploadFile] = File(None),
    url: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    # Check if request has JSON payload with url
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        try:
            body = await request.json()
            if isinstance(body, dict):
                json_url = body.get("url")
                if json_url:
                    url = str(json_url).strip()
        except Exception:
            pass

    # Clean empty strings
    if url is not None:
        url = url.strip()
        if not url:
            url = None

    # Check if file was provided with a non-empty filename
    has_file = file is not None and bool(file.filename)

    if not has_file and not url:
        raise HTTPException(
            status_code=400,
            detail="Either 'file' or 'url' must be provided."
        )

    temp_dir = Path(tempfile.gettempdir()) / "omnivise_temp_evidence"
    temp_dir.mkdir(parents=True, exist_ok=True)

    ingested_at = datetime.now(timezone.utc).isoformat()

    if has_file and file is not None and file.filename:
        content = await file.read()
        file_hash = hashlib.sha256(content).hexdigest()
        file_size = len(content)
        safe_name = Path(file.filename).name
        temp_file_path = temp_dir / f"{uuid4().hex}_{safe_name}"
        temp_file_path.write_bytes(content)

        detected_mime = mimetypes.guess_type(file.filename)[0]
        mime_type = file.content_type if (file.content_type and file.content_type != "application/octet-stream") else (detected_mime or "application/octet-stream")

        parsed_data, parser_name = parse_evidence(
            file_path=temp_file_path,
            filename=file.filename,
            url=None,
            mime_type=mime_type,
        )

        provenance = Provenance(
            file_name=file.filename,
            file_hash=file_hash,
            temp_path=str(temp_file_path),
            parser_used=parser_name,
            file_size_bytes=file_size,
            mime_type=mime_type,
            ingested_at=ingested_at,
            storage_type="ephemeral_temp",
        )
    else:
        # URL evidence
        assert url is not None
        url_bytes = url.encode("utf-8")
        file_hash = hashlib.sha256(url_bytes).hexdigest()
        file_size = len(url_bytes)
        mime_type = "text/html"

        parsed_data, parser_name = parse_evidence(
            file_path=None,
            filename=None,
            url=url,
            mime_type=mime_type,
        )

        provenance = Provenance(
            file_name=url,
            file_hash=file_hash,
            temp_path=None,
            parser_used=parser_name,
            file_size_bytes=file_size,
            mime_type=mime_type,
            ingested_at=ingested_at,
            storage_type="ephemeral_temp",
        )

    evidence_obj = EvidenceObject(
        id=f"ev-{uuid4().hex[:8]}",
        source=parsed_data.get("source") or (file.filename if has_file and file else url),
        modality=parsed_data.get("modality", "unknown"),
        claim=parsed_data.get("claim", ""),
        entity=parsed_data.get("entity"),
        value=parsed_data.get("value"),
        date=parsed_data.get("date"),
        version="1.0",
        location=parsed_data.get("location"),
        provenance=provenance,
        raw_text_preview=parsed_data.get("raw_text_preview"),
        metadata=parsed_data.get("metadata", {}),
    )

    index_evidence(evidence_obj)

    source_name = file.filename if (has_file and file and file.filename) else (url or "Uploaded Evidence")

    # Persist in encrypted database table (claim, raw_text_preview, provenance, metadata encrypted at-rest)
    try:
        session_id = request.headers.get("X-Session-ID") or request.query_params.get("session_id")
        record = EvidenceRecord(
            id=evidence_obj.id,
            source=evidence_obj.source,
            modality=evidence_obj.modality,
            claim=evidence_obj.claim,
            entity=evidence_obj.entity,
            value=evidence_obj.value,
            date=evidence_obj.date,
            location=evidence_obj.location,
            file_hash=file_hash,
            file_size_bytes=file_size,
            session_id=session_id,
            raw_text_preview=evidence_obj.raw_text_preview,
            provenance=provenance.model_dump(),
            metadata_blob=evidence_obj.metadata,
        )
        db.add(record)
        db.commit()
    except Exception:
        db.rollback()

    # Trigger notification pipeline for affected Decision Snapshots
    try:
        notify_affected_decisions(db, source_name)
    except Exception:
        pass

    # Log activity event
    try:
        log_activity(
            db,
            action_type="evidence_uploaded",
            target=source_name,
            details={"evidence_id": evidence_obj.id, "modality": evidence_obj.modality},
        )
    except Exception:
        pass

    return evidence_obj


@router.get("/")
def list_evidence(
    session_id: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """Retrieve evidence records with transparent at-rest field decryption."""
    query = db.query(EvidenceRecord)
    if session_id:
        query = query.filter(EvidenceRecord.session_id == session_id)
    records = query.order_by(EvidenceRecord.created_at.desc()).limit(limit).all()
    return [
        {
            "id": r.id,
            "source": r.source,
            "modality": r.modality,
            "claim": r.claim,
            "entity": r.entity,
            "value": r.value,
            "date": r.date,
            "location": r.location,
            "file_hash": r.file_hash,
            "file_size_bytes": r.file_size_bytes,
            "session_id": r.session_id,
            "raw_text_preview": r.raw_text_preview,
            "provenance": r.provenance,
            "metadata": r.metadata_blob,
            "created_at": r.created_at,
        }
        for r in records
    ]


@router.get("/{evidence_id}")
def get_evidence(evidence_id: str, db: Session = Depends(get_db)):
    """Retrieve a single evidence record by ID, transparently decrypted."""
    record = db.query(EvidenceRecord).filter(EvidenceRecord.id == evidence_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Evidence record not found")
    return {
        "id": record.id,
        "source": record.source,
        "modality": record.modality,
        "claim": record.claim,
        "entity": record.entity,
        "value": record.value,
        "date": record.date,
        "location": record.location,
        "file_hash": record.file_hash,
        "file_size_bytes": record.file_size_bytes,
        "session_id": record.session_id,
        "raw_text_preview": record.raw_text_preview,
        "provenance": record.provenance,
        "metadata": record.metadata_blob,
        "created_at": record.created_at,
    }


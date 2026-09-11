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

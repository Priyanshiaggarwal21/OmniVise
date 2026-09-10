from typing import List
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.auth import require_write
from app.contradiction import detect_contradictions, extract_claims
from app.schemas import DocumentPage, ExtractedClaim, IngestedDocument
from app import store

router = APIRouter()


def _pages_from_text(text: str) -> List[DocumentPage]:
    chunks = [text[i : i + 900] for i in range(0, max(len(text), 1), 900)] or [""]
    return [DocumentPage(page=idx + 1, text=chunk or "(empty page)") for idx, chunk in enumerate(chunks[:12])]


@router.post("/upload")
async def upload_file(file: UploadFile = File(...), _user: dict = Depends(require_write)):
    content = await file.read()
    text_content = content.decode("utf-8", errors="ignore")
    filename = file.filename or "untitled.txt"
    doc_id = f"doc-{uuid4().hex[:8]}"

    claims, ai_status = extract_claims(filename, text_content)
    persisted: List[ExtractedClaim] = []
    for claim in claims:
        persisted.append(store.upsert_claim(claim))

    discrepancies, contradiction_engine = detect_contradictions(persisted)
    for item in discrepancies:
        store.upsert_discrepancy(item)

    document = IngestedDocument(
        id=doc_id,
        filename=filename,
        status="processed",
        progress=100,
        pages=_pages_from_text(text_content),
        claim_ids=[c.id for c in persisted],
        summary=persisted[0].statement_text if persisted else "Processed successfully.",
        ai_engine=f"{ai_status} | contradictions: {contradiction_engine}",
    )
    store.upsert_document(document)

    return {
        "filename": filename,
        "status": "processed",
        "ai_engine": document.ai_engine,
        "summary": document.summary,
        "document": document.model_dump(mode="json"),
        "claims": [c.model_dump(mode="json") for c in persisted],
        "discrepancies": [d.model_dump(mode="json") for d in discrepancies],
    }


@router.get("/documents")
def list_documents():
    return [d.model_dump(mode="json") for d in store.documents]


@router.get("/documents/{document_id}")
def get_document(document_id: str):
    document = next((d for d in store.documents if d.id == document_id), None)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    linked = [c.model_dump(mode="json") for c in store.claims if c.id in document.claim_ids or c.source_document in document.filename]
    if not linked:
        linked = [
            c.model_dump(mode="json")
            for c in store.claims
            if document.filename.replace("_", " ").split(".")[0].lower() in c.source_document.lower()
            or c.source_document.lower() in document.filename.lower().replace("_", " ")
        ]
    return {"document": document.model_dump(mode="json"), "claims": linked}

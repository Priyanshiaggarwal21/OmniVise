import csv
import io
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse

from app.auth import require_write
from app.schemas import Discrepancy, ExtractedClaim, GraphEdge, GraphNode, GraphResponse, StatsResponse, StatusUpdate
from app import store

router = APIRouter()


@router.get("/discrepancies", response_model=List[Discrepancy])
def get_discrepancies():
    return store.discrepancies


@router.get("/discrepancies/{discrepancy_id}", response_model=Discrepancy)
def get_discrepancy(discrepancy_id: str):
    item = next((d for d in store.discrepancies if d.id == discrepancy_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Discrepancy not found")
    return item


@router.patch("/discrepancies/{discrepancy_id}", response_model=Discrepancy)
def patch_discrepancy(discrepancy_id: str, payload: StatusUpdate, _user: dict = Depends(require_write)):
    updated = store.update_status(discrepancy_id, payload.status)
    if not updated:
        raise HTTPException(status_code=404, detail="Discrepancy not found")
    return updated


@router.get("/claims", response_model=List[ExtractedClaim])
def get_claims(period: Optional[str] = None):
    if not period:
        return store.claims
    return [c for c in store.claims if period.lower() in c.reporting_period.lower()]


@router.get("/stats", response_model=StatsResponse)
def get_stats():
    return store.stats()


@router.get("/events")
def get_events(limit: int = Query(50, ge=1, le=200)):
    return [e.model_dump(mode="json") for e in store.events[:limit]]


@router.get("/graph", response_model=GraphResponse)
def get_graph():
    nodes: List[GraphNode] = []
    edges: List[GraphEdge] = []
    entity_ids = {}
    doc_ids = {}

    entities = sorted({c.entity for c in store.claims})
    for idx, entity in enumerate(entities):
        nid = f"ent-{idx}"
        entity_ids[entity] = nid
        nodes.append(GraphNode(id=nid, label=entity, kind="entity", x=8 + idx * 6, y=18 + idx * 22))

    docs = sorted({c.source_document for c in store.claims})
    for idx, doc in enumerate(docs):
        nid = f"doc-{idx}"
        doc_ids[doc] = nid
        nodes.append(GraphNode(id=nid, label=doc, kind="document", x=28 + (idx % 4) * 8, y=12 + (idx * 14) % 78))

    for idx, claim in enumerate(store.claims):
        nid = f"claim-{claim.id}"
        nodes.append(
            GraphNode(
                id=nid,
                label=f"{claim.metric} {claim.value} ({claim.reporting_period})",
                kind="claim",
                x=52 + (idx % 5) * 6,
                y=10 + (idx * 11) % 80,
                related_ids=[claim.id],
            )
        )
        if claim.entity in entity_ids:
            edges.append(GraphEdge(id=f"e-{nid}-ent", source=entity_ids[claim.entity], target=nid, kind="entity-claim"))
        if claim.source_document in doc_ids:
            edges.append(GraphEdge(id=f"e-{nid}-doc", source=doc_ids[claim.source_document], target=nid, kind="document-claim"))

    for idx, disc in enumerate(store.discrepancies):
        nid = f"contra-{disc.id}"
        nodes.append(
            GraphNode(
                id=nid,
                label=f"{disc.id} {disc.metric}",
                kind="contradiction",
                x=82,
                y=14 + idx * 16,
                severity=disc.severity.value,
                related_ids=[disc.id, disc.claimed_claim_id or "", disc.reported_claim_id or ""],
            )
        )
        if disc.claimed_claim_id:
            edges.append(GraphEdge(id=f"e-{nid}-c", source=f"claim-{disc.claimed_claim_id}", target=nid, kind="claim-contradiction"))
        if disc.reported_claim_id:
            edges.append(GraphEdge(id=f"e-{nid}-r", source=f"claim-{disc.reported_claim_id}", target=nid, kind="claim-contradiction"))

    return GraphResponse(nodes=nodes, edges=edges)


@router.get("/reports/export")
def export_report(format: str = Query("csv")):
    rows = store.discrepancies
    fmt = (format or "csv").lower()
    if fmt not in {"csv", "json", "pdf"}:
        raise HTTPException(status_code=400, detail="format must be csv, json, or pdf")
    format = fmt
    if format == "json":
        return {
            "generated_for": "OmniVise Audit Trail",
            "stats": store.stats().model_dump(),
            "discrepancies": [d.model_dump(mode="json") for d in rows],
            "claims": [c.model_dump(mode="json") for c in store.claims],
        }

    if format == "csv":
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(
            [
                "id",
                "entity",
                "metric",
                "claimed_value",
                "reported_value",
                "difference",
                "percentage_diff",
                "severity",
                "confidence_score",
                "contradiction_type",
                "status",
                "evidence_source",
                "reporting_period",
            ]
        )
        for item in rows:
            writer.writerow(
                [
                    item.id,
                    item.entity,
                    item.metric,
                    item.claimed_value,
                    item.reported_value,
                    item.difference,
                    item.percentage_diff,
                    item.severity.value,
                    item.confidence_score,
                    item.contradiction_type.value,
                    item.status.value,
                    item.evidence_source,
                    item.reporting_period,
                ]
            )
        buffer.seek(0)
        return StreamingResponse(
            iter([buffer.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=omnivise-audit-trail.csv"},
        )

    lines = [
        "OmniVise Audit Trail",
        f"Discrepancies: {len(rows)}",
        "",
    ]
    for item in rows:
        lines.append(f"{item.id} | {item.metric} | {item.claimed_value} vs {item.reported_value} | {item.status.value}")
    pdf_bytes = _simple_pdf("\n".join(lines))
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=omnivise-audit-trail.pdf"},
    )


def _simple_pdf(text: str) -> bytes:
    safe = text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    stream = f"BT /F1 11 Tf 48 750 Td ({safe[:1800]}) Tj ET"
    objects = [
        b"1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj",
        b"2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj",
        b"3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj",
        f"4 0 obj<< /Length {len(stream)} >>stream\n{stream}\nendstream endobj".encode("latin-1", errors="replace"),
        b"5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj",
    ]
    buffer = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for obj in objects:
        offsets.append(len(buffer))
        buffer.extend(obj + b"\n")
    xref_pos = len(buffer)
    buffer.extend(f"xref\n0 {len(objects)+1}\n0000000000 65535 f \n".encode("ascii"))
    for off in offsets[1:]:
        buffer.extend(f"{off:010d} 00000 n \n".encode("ascii"))
    buffer.extend(
        f"trailer<< /Size {len(objects)+1} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF".encode("ascii")
    )
    return bytes(buffer)

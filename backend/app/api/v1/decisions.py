"""
Decision Snapshots API router.

Endpoints
---------
POST   /               — Save a new Decision Snapshot (status auto-derived)
GET    /               — List all snapshots, newest first
GET    /{id}           — Full detail for one snapshot
DELETE /{id}           — Delete a snapshot
GET    /{id}/export-pdf — Generate and stream a PDF report
"""
from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.activity import log_activity
from app.core.database import get_db
from app.models.decision_snapshot import DecisionSnapshot
from app.services.pdf_exporter import generate_decision_pdf

router = APIRouter()

# ── Pydantic schemas ──────────────────────────────────────────────────────────


class SaveDecisionRequest(BaseModel):
    """Payload sent by the workspace 'Save as Decision Snapshot' button."""

    question: str
    conclusion: Optional[str] = ""
    reasoning: Optional[str] = ""
    confidence_badge: Optional[str] = None
    metrics: Optional[List[Dict[str, Any]]] = None
    supporting_refs: Optional[List[Any]] = None
    conflicting_refs: Optional[List[Any]] = None
    missing_evidence_note: Optional[Any] = None
    evidence_used: Optional[List[Any]] = None
    decomposed_query: Optional[Any] = None

    # Robustness — populated when stress-test was run before saving
    robustness_score: Optional[float] = None
    robustness_percentage: Optional[int] = None
    critical_evidence: Optional[List[Any]] = None

    # Optional explicit status override; if omitted it's auto-derived
    status: Optional[str] = None

    model_config = {"extra": "allow"}


class DecisionSnapshotOut(BaseModel):
    """Response shape for list and detail endpoints."""

    id: str
    question: str
    conclusion: str
    reasoning: str
    confidence_badge: Optional[str]
    status: str
    robustness_score: Optional[float]
    robustness_percentage: Optional[int]
    metrics: Optional[List[Dict[str, Any]]]
    supporting_refs: Optional[List[Any]]
    conflicting_refs: Optional[List[Any]]
    missing_evidence_note: Optional[Any]
    critical_evidence: Optional[List[Any]]
    evidence_used: Optional[List[Any]]
    decomposed_query: Optional[Any]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Status derivation ─────────────────────────────────────────────────────────


def _derive_status(
    robustness_percentage: Optional[int],
    conflicting_refs: Optional[List],
) -> str:
    """Auto-derive PASS / REVIEW / BLOCK from evidence quality signals."""
    has_conflicts = bool(conflicting_refs)

    if robustness_percentage is None:
        # Stress test not run — derive from conflicts only
        return "REVIEW" if has_conflicts else "PASS"

    if robustness_percentage < 40:
        return "BLOCK"
    if robustness_percentage >= 75 and not has_conflicts:
        return "PASS"
    return "REVIEW"


# ── Helpers ───────────────────────────────────────────────────────────────────


def _get_or_404(snapshot_id: str, db: Session) -> DecisionSnapshot:
    snap = db.query(DecisionSnapshot).filter(DecisionSnapshot.id == snapshot_id).first()
    if not snap:
        raise HTTPException(status_code=404, detail=f"Decision snapshot '{snapshot_id}' not found.")
    return snap


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.post("/", status_code=201, response_model=DecisionSnapshotOut)
def save_decision(payload: SaveDecisionRequest, db: Session = Depends(get_db)):
    """Save the current workspace query result as a Decision Snapshot."""
    if not payload.question or not payload.question.strip():
        raise HTTPException(status_code=400, detail="'question' must be a non-empty string.")

    status = (
        payload.status
        if payload.status in ("PASS", "REVIEW", "BLOCK")
        else _derive_status(payload.robustness_percentage, payload.conflicting_refs)
    )

    now = datetime.now(UTC)
    snap = DecisionSnapshot(
        id=str(uuid.uuid4()),
        question=payload.question.strip(),
        conclusion=payload.conclusion or "",
        reasoning=payload.reasoning or "",
        confidence_badge=payload.confidence_badge,
        status=status,
        robustness_score=payload.robustness_score,
        robustness_percentage=payload.robustness_percentage,
        metrics=payload.metrics,
        supporting_refs=payload.supporting_refs,
        conflicting_refs=payload.conflicting_refs,
        missing_evidence_note=payload.missing_evidence_note,
        evidence_used=payload.evidence_used,
        decomposed_query=payload.decomposed_query,
        critical_evidence=payload.critical_evidence,
        created_at=now,
        updated_at=now,
    )
    db.add(snap)
    db.commit()
    db.refresh(snap)

    # Log activity event
    try:
        q_snip = (snap.question[:100] + "...") if len(snap.question) > 100 else snap.question
        log_activity(
            db,
            action_type="decision_saved",
            target=f"Snapshot: {q_snip}",
            details={"snapshot_id": snap.id, "status": snap.status, "robustness": snap.robustness_percentage},
        )
    except Exception:
        pass

    return snap


@router.post("/{snapshot_id}/review", response_model=DecisionSnapshotOut)
def review_decision(snapshot_id: str, db: Session = Depends(get_db)):
    """Mark a decision snapshot as reviewed."""
    snap = _get_or_404(snapshot_id, db)
    snap.status = "REVIEW"
    snap.updated_at = datetime.now(UTC)
    db.commit()
    db.refresh(snap)

    try:
        q_snip = (snap.question[:100] + "...") if len(snap.question) > 100 else snap.question
        log_activity(
            db,
            action_type="decision_reviewed",
            target=f"Snapshot: {q_snip}",
            details={"snapshot_id": snap.id, "status": snap.status},
        )
    except Exception:
        pass

    return snap


@router.post("/{snapshot_id}/approve", response_model=DecisionSnapshotOut)
def approve_decision(snapshot_id: str, db: Session = Depends(get_db)):
    """Approve a decision snapshot (sets status to PASS)."""
    snap = _get_or_404(snapshot_id, db)
    snap.status = "PASS"
    snap.updated_at = datetime.now(UTC)
    db.commit()
    db.refresh(snap)

    try:
        q_snip = (snap.question[:100] + "...") if len(snap.question) > 100 else snap.question
        log_activity(
            db,
            action_type="decision_approved",
            target=f"Snapshot: {q_snip}",
            details={"snapshot_id": snap.id, "status": snap.status},
        )
    except Exception:
        pass

    return snap


@router.get("/", response_model=List[DecisionSnapshotOut])
def list_decisions(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """Return all snapshots ordered newest first (paginated)."""
    snapshots = (
        db.query(DecisionSnapshot)
        .order_by(DecisionSnapshot.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return snapshots


@router.get("/{snapshot_id}", response_model=DecisionSnapshotOut)
def get_decision(snapshot_id: str, db: Session = Depends(get_db)):
    """Return the full detail for a single snapshot."""
    return _get_or_404(snapshot_id, db)


@router.delete("/{snapshot_id}", status_code=204)
def delete_decision(snapshot_id: str, db: Session = Depends(get_db)):
    """Permanently delete a snapshot."""
    snap = _get_or_404(snapshot_id, db)
    db.delete(snap)
    db.commit()
    return Response(status_code=204)


@router.get("/{snapshot_id}/export-pdf")
def export_decision_pdf(snapshot_id: str, db: Session = Depends(get_db)):
    """Generate and stream a PDF report for the given Decision Snapshot."""
    snap = _get_or_404(snapshot_id, db)

    try:
        pdf_bytes = generate_decision_pdf(snap)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {exc}")

    safe_id = snapshot_id[:8]
    filename = f"decision_snapshot_{safe_id}.pdf"

    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

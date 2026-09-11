"""
Notifications API router.

Endpoints
---------
GET  /                   — List all notifications (newest first)
POST /{id}/read          — Mark a notification as read
POST /read-all           — Mark all notifications as read
POST /                   — Create a notification
POST /trigger-source-update — Trigger notification for source update affecting decision snapshots
"""
from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.decision_snapshot import DecisionSnapshot
from app.models.notification import Notification

router = APIRouter()


# ── Pydantic Schemas ──────────────────────────────────────────────────────────


class NotificationCreate(BaseModel):
    message: str
    user_id: Optional[str] = None
    related_decision_id: Optional[str] = None


class NotificationOut(BaseModel):
    id: str
    user_id: Optional[str] = None
    message: str
    related_decision_id: Optional[str] = None
    read: bool = Field(default=False, validation_alias="is_read")
    is_read: bool = False
    created_at: datetime

    model_config = {
        "from_attributes": True,
        "populate_by_name": True,
    }


class TriggerSourceRequest(BaseModel):
    source_filename: str
    claims_count: Optional[int] = 0
    user_id: Optional[str] = None


# ── Trigger & Detection Logic ─────────────────────────────────────────────────


def notify_affected_decisions(
    db: Session,
    source_filename: str,
    claims_count: int = 0,
    user_id: Optional[str] = None,
) -> List[Notification]:
    """
    Evaluates whether a newly uploaded or updated source document affects existing
    Decision Snapshots. If the document matches or overlaps with evidence references,
    or stub trigger if versioning is not yet fully wired, creates a notification.
    """
    created_notifications: List[Notification] = []
    clean_name = source_filename.lower().strip()

    # Query all active decision snapshots
    snapshots = db.query(DecisionSnapshot).order_by(DecisionSnapshot.created_at.desc()).all()

    affected_snapshots: List[DecisionSnapshot] = []

    for snap in snapshots:
        # Check supporting references
        refs = (snap.supporting_refs or []) + (snap.conflicting_refs or []) + (snap.evidence_used or [])
        matched = False
        for r in refs:
            src_str = ""
            if isinstance(r, dict):
                src_str = str(r.get("source") or r.get("sourceDoc") or "").lower()
            elif isinstance(r, str):
                src_str = r.lower()

            if src_str and (src_str in clean_name or clean_name in src_str):
                matched = True
                break

        if matched:
            affected_snapshots.append(snap)

    # Stub behavior: If no direct filename match found but snapshots exist,
    # target the most recent snapshot so the pipeline trigger is demonstrable
    if not affected_snapshots and snapshots:
        affected_snapshots = [snapshots[0]]

    now = datetime.now(UTC)
    for snap in affected_snapshots:
        question_snip = snap.question[:60] + ("..." if len(snap.question) > 60 else "")
        msg = (
            f"Source update: New evidence '{source_filename}' ingested may affect "
            f"Decision Snapshot: '{question_snip}'."
        )
        notif = Notification(
            id=str(uuid.uuid4()),
            user_id=user_id,
            message=msg,
            related_decision_id=snap.id,
            is_read=False,
            created_at=now,
        )
        db.add(notif)
        created_notifications.append(notif)

    # Fallback if no snapshots exist at all yet
    if not created_notifications:
        msg = (
            f"Source update: Ingested '{source_filename}' ({claims_count} claims extracted). "
            f"Available for future Decision Snapshots."
        )
        notif = Notification(
            id=str(uuid.uuid4()),
            user_id=user_id,
            message=msg,
            related_decision_id=None,
            is_read=False,
            created_at=now,
        )
        db.add(notif)
        created_notifications.append(notif)

    db.commit()
    for n in created_notifications:
        db.refresh(n)

    return created_notifications


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.get("/", response_model=List[NotificationOut])
def list_notifications(
    unread_only: bool = False,
    user_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """List notifications, newest first."""
    query = db.query(Notification)
    if unread_only:
        query = query.filter(Notification.is_read.is_(False))
    if user_id:
        query = query.filter((Notification.user_id == user_id) | (Notification.user_id.is_(None)))

    notifications = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()
    # Normalize read attribute
    for n in notifications:
        n.read = n.is_read
    return notifications


@router.post("/{notification_id}/read", response_model=NotificationOut)
def mark_notification_read(
    notification_id: str,
    db: Session = Depends(get_db),
):
    """Mark a notification as read."""
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(
            status_code=404,
            detail=f"Notification '{notification_id}' not found.",
        )

    notif.is_read = True
    notif.read = True
    db.commit()
    db.refresh(notif)
    return notif


@router.post("/read-all", status_code=200)
def mark_all_read(
    user_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Mark all notifications as read."""
    query = db.query(Notification).filter(Notification.is_read.is_(False))
    if user_id:
        query = query.filter((Notification.user_id == user_id) | (Notification.user_id.is_(None)))
    count = query.update({"is_read": True})
    db.commit()
    return {"updated": count, "status": "ok"}


@router.post("/", status_code=201, response_model=NotificationOut)
def create_notification(
    payload: NotificationCreate,
    db: Session = Depends(get_db),
):
    """Create a new notification manually."""
    if not payload.message or not payload.message.strip():
        raise HTTPException(status_code=400, detail="'message' must be a non-empty string.")

    now = datetime.now(UTC)
    notif = Notification(
        id=str(uuid.uuid4()),
        user_id=payload.user_id,
        message=payload.message.strip(),
        related_decision_id=payload.related_decision_id,
        is_read=False,
        created_at=now,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    notif.read = notif.is_read
    return notif


@router.post("/trigger-source-update", status_code=201, response_model=List[NotificationOut])
def trigger_source_update_notification(
    payload: TriggerSourceRequest,
    db: Session = Depends(get_db),
):
    """Trigger the notification evaluation pipeline for a source update."""
    if not payload.source_filename or not payload.source_filename.strip():
        raise HTTPException(status_code=400, detail="'source_filename' must be provided.")

    notifs = notify_affected_decisions(
        db=db,
        source_filename=payload.source_filename.strip(),
        claims_count=payload.claims_count or 0,
        user_id=payload.user_id,
    )
    return notifs

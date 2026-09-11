from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import get_optional_user
from app.core.database import get_db
from app.models.activity_log import ActivityLog
from app.models.user import User

router = APIRouter()


# -- Pydantic Schemas ----------------------------------------------------------


class ActivityLogCreate(BaseModel):
    action_type: str
    target: str
    user_id: Optional[str] = None
    details: Optional[Any] = None


class ActivityLogOut(BaseModel):
    id: str
    user_id: Optional[str] = None
    action_type: str
    target: str
    timestamp: datetime
    details: Optional[str] = None

    model_config = {"from_attributes": True}


class ActivityStatsOut(BaseModel):
    total_events: int
    action_counts: Dict[str, int]
    latest_timestamp: Optional[datetime] = None


# -- Logging Helper ------------------------------------------------------------


def log_activity(
    db: Session,
    action_type: str,
    target: str,
    user_id: Optional[str] = None,
    details: Optional[Any] = None,
) -> Optional[ActivityLog]:
    """
    Central helper to record an activity log entry safely.
    Handles serialization of details, persists to DB, and swallows exceptions
    so logging issues never disrupt primary user flows.
    """
    try:
        details_str: Optional[str] = None
        if details is not None:
            if isinstance(details, str):
                details_str = details
            else:
                details_str = json.dumps(details, default=str)

        entry = ActivityLog(
            id=str(uuid.uuid4()),
            user_id=user_id,
            action_type=action_type.strip(),
            target=target.strip(),
            timestamp=datetime.now(UTC),
            details=details_str,
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry
    except Exception:
        db.rollback()
        return None


# -- Access Guard Helper -------------------------------------------------------

ALLOWED_ROLES = {"admin", "reviewer"}


def verify_activity_access(
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    current_user: Optional[User] = Depends(get_optional_user),
) -> None:
    """
    Validates that the requester has Admin or Reviewer privileges.
    Checks authenticated JWT user if present, or X-User-Role client header.
    """
    role = None
    if current_user and current_user.role:
        role = current_user.role.lower().strip()
    elif x_user_role:
        role = x_user_role.lower().strip()

    # If role information is provided and not in allowed roles, forbid access
    if role and role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: Activity Log is restricted to Admin and Reviewer roles. Current role: '{role}'",
        )


# -- Endpoints -----------------------------------------------------------------


@router.get("/", response_model=List[ActivityLogOut])
def list_activities(
    action_type: Optional[str] = Query(None, description="Filter by action_type"),
    user_id: Optional[str] = Query(None, description="Filter by user_id"),
    search: Optional[str] = Query(None, description="Search in target or details"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    _access: None = Depends(verify_activity_access),
    db: Session = Depends(get_db),
):
    """
    List activity log events in reverse chronological order (newest first).
    Supports filtering by action_type, user_id, and free-text search.
    """
    query = db.query(ActivityLog)

    if action_type and action_type.strip():
        query = query.filter(ActivityLog.action_type == action_type.strip())

    if user_id and user_id.strip():
        query = query.filter(ActivityLog.user_id == user_id.strip())

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            (ActivityLog.target.ilike(term)) | (ActivityLog.details.ilike(term))
        )

    logs = query.order_by(ActivityLog.timestamp.desc()).offset(skip).limit(limit).all()
    return logs


@router.get("/stats", response_model=ActivityStatsOut)
def get_activity_stats(
    _access: None = Depends(verify_activity_access),
    db: Session = Depends(get_db),
):
    """Get aggregated metrics and event counts for the activity dashboard."""
    logs = db.query(ActivityLog).all()
    total = len(logs)
    counts: Dict[str, int] = {}
    latest: Optional[datetime] = None

    for log in logs:
        counts[log.action_type] = counts.get(log.action_type, 0) + 1
        if latest is None or (log.timestamp and log.timestamp > latest):
            latest = log.timestamp

    return ActivityStatsOut(
        total_events=total,
        action_counts=counts,
        latest_timestamp=latest,
    )


@router.post("/", status_code=201, response_model=ActivityLogOut)
def create_activity(
    payload: ActivityLogCreate,
    _access: None = Depends(verify_activity_access),
    db: Session = Depends(get_db),
):
    """
    Manually log an activity event or trigger a simulated event.
    """
    if not payload.action_type or not payload.action_type.strip():
        raise HTTPException(status_code=400, detail="'action_type' must be specified.")
    if not payload.target or not payload.target.strip():
        raise HTTPException(status_code=400, detail="'target' must be specified.")

    entry = log_activity(
        db=db,
        action_type=payload.action_type.strip(),
        target=payload.target.strip(),
        user_id=payload.user_id,
        details=payload.details,
    )
    if not entry:
        raise HTTPException(status_code=500, detail="Failed to record activity log.")

    return entry

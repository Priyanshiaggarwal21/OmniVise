from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.api.v1.activity import log_activity
from app.auth import get_optional_user
from app.core.database import get_db
from app.models.user import User
from app.services.cleanup import purge_session_data

router = APIRouter()


@router.post("/purge")
def purge_session_endpoint(
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """
    Purge Session Data Endpoint.
    Deletes all temporary files, intermediate extraction artifacts, temp embeddings,
    and temp screen-capture frames tied to the active session.
    """
    result = purge_session_data(session_id=x_session_id)

    # Log activity for SOC2 zero-retention compliance audit trail
    try:
        user_id = current_user.id if current_user else None
        user_email = current_user.email if current_user else "anonymous"
        log_activity(
            db,
            action_type="session_purged",
            target="Temporary workspace artifacts and cache purged",
            user_id=user_id,
            details={
                "user": user_email,
                "deleted_files": result.get("deleted_files_count"),
                "embeddings_purged": result.get("embeddings_purged"),
            },
        )
    except Exception:
        pass

    return result


@router.post("/cleanup")
def session_cleanup_webhook(
    session_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Session End Webhook.
    Triggered when a user session ends or browser closes, ensuring zero-retention compliance.
    """
    result = purge_session_data(session_id=session_id)
    return {
        "status": "cleaned",
        "session_id": session_id,
        "details": result,
    }

import uuid
from datetime import UTC, datetime

from sqlalchemy import Column, DateTime, String, Text

from app.core.database import Base


class ActivityLog(Base):
    """Activity Log table storing chronological events for auditability."""

    __tablename__ = "activity_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=True, index=True)
    action_type = Column(String, nullable=False, index=True)  # e.g. evidence_uploaded, query_run, decision_saved, decision_reviewed, decision_approved
    target = Column(String, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(UTC), index=True)
    details = Column(Text, nullable=True)  # Optional JSON string or descriptive detail

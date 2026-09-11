import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, Column, DateTime, String, Text

from app.core.database import Base


class Notification(Base):
    """Notification for audit updates, source changes, and decision snapshot alerts."""

    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=True, index=True)
    message = Column(Text, nullable=False)
    related_decision_id = Column(String, nullable=True, index=True)
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))

    @property
    def read(self) -> bool:
        return self.is_read

    @read.setter
    def read(self, value: bool):
        self.is_read = value

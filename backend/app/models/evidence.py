from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Float, Integer, String, Text

from app.core.database import Base
from app.core.encryption import EncryptedJSON, EncryptedText


class EvidenceRecord(Base):
    """Encrypted ORM Model for ingested evidence and documents.

    Sensitive fields (claim statement, raw document preview, provenance, and metadata)
    are encrypted at-rest using authenticated symmetric Fernet encryption before being written
    to SQLite or Postgres, and automatically decrypted when read.
    """

    __tablename__ = "evidence_records"

    id = Column(String, primary_key=True, default=lambda: f"ev-{uuid.uuid4().hex[:8]}")

    # Metadata & routing fields
    source = Column(String, nullable=False, index=True)
    modality = Column(String, nullable=False, default="text", index=True)
    entity = Column(String, nullable=True, index=True)
    value = Column(Float, nullable=True)
    date = Column(String, nullable=True)
    location = Column(String, nullable=True)
    file_hash = Column(String, nullable=True, index=True)
    file_size_bytes = Column(Integer, nullable=False, default=0)
    session_id = Column(String, nullable=True, index=True)

    # Sensitive fields encrypted at-rest
    claim = Column(EncryptedText, nullable=True)
    raw_text_preview = Column(EncryptedText, nullable=True)
    provenance = Column(EncryptedJSON, nullable=True)
    metadata_blob = Column(EncryptedJSON, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

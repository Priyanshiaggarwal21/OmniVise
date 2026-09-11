import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, String, Text
from sqlalchemy.types import JSON

from app.core.database import Base


class DecisionSnapshot(Base):
    """Persisted record of a workspace query conclusion that an analyst chose to save."""

    __tablename__ = "decision_snapshots"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    # Core audit fields
    question = Column(Text, nullable=False)
    conclusion = Column(Text, nullable=False, default="")
    reasoning = Column(Text, nullable=False, default="")
    confidence_badge = Column(String, nullable=True)

    # Status: PASS / REVIEW / BLOCK (auto-derived or user-set)
    status = Column(String, nullable=False, default="REVIEW")

    # Robustness (populated if stress-test was run before saving)
    robustness_score = Column(Float, nullable=True)
    robustness_percentage = Column(Integer, nullable=True)

    # JSON blobs — stored as TEXT in SQLite, proper JSON in Postgres
    evidence_used = Column(JSON, nullable=True)       # list of evidence dicts
    metrics = Column(JSON, nullable=True)             # [{label, value, badge}, ...]
    supporting_refs = Column(JSON, nullable=True)     # list of supporting evidence refs
    conflicting_refs = Column(JSON, nullable=True)    # list of conflicting evidence refs
    missing_evidence_note = Column(JSON, nullable=True)
    critical_evidence = Column(JSON, nullable=True)   # from stress-test
    decomposed_query = Column(JSON, nullable=True)    # sub-questions from decomposer

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

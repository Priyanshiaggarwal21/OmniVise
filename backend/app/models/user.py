import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=True, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="analyst")  # analyst, reviewer, admin, executive
    vault_pin_hash = Column(String, nullable=True)
    vault_failed_attempts = Column(Integer, default=0, nullable=False)
    vault_locked_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


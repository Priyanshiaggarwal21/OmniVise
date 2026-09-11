from datetime import datetime
from enum import Enum
from typing import List, Optional
from uuid import uuid4

from pydantic import BaseModel, Field


class ContradictionType(str, Enum):
    numerical = "Numerical"
    temporal = "Temporal"
    semantic = "Semantic"


class DiscrepancyStatus(str, Enum):
    open = "Open"
    in_review = "In Review"
    confirmed = "Confirmed"
    dismissed = "Dismissed"
    needs_review = "Needs Review"
    escalated = "Escalated"


class Severity(str, Enum):
    critical = "Critical"
    high = "High"
    medium = "Medium"
    low = "Low"


class Role(str, Enum):
    admin = "Admin"
    auditor = "Auditor"
    viewer = "Viewer"


class ExtractedClaim(BaseModel):
    id: str
    entity: str
    metric: str
    value: float
    currency_unit: str
    reporting_period: str
    source_document: str
    page_or_timestamp: str
    speaker: str
    statement_text: str = ""
    extracted_at: datetime = Field(default_factory=datetime.utcnow)
    confidence_score: float = 0.9


class Discrepancy(BaseModel):
    id: str
    metric: str
    entity: str
    claimed_value: float
    reported_value: float
    difference: float
    percentage_diff: float
    severity: Severity
    confidence_score: float
    contradiction_type: ContradictionType
    status: DiscrepancyStatus = DiscrepancyStatus.open
    evidence_source: str
    claimed_claim_id: Optional[str] = None
    reported_claim_id: Optional[str] = None
    executive_statement: str = ""
    source_evidence: str = ""
    claimed_source: str = ""
    reported_source: str = ""
    reporting_period: str = ""
    currency_unit: str = "USD"
    alignment: dict = Field(default_factory=dict)
    timestamp: str = ""
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class DocumentPage(BaseModel):
    page: int
    text: str


class IngestedDocument(BaseModel):
    id: str
    filename: str
    status: str = "processed"
    progress: int = 100
    pages: List[DocumentPage] = Field(default_factory=list)
    claim_ids: List[str] = Field(default_factory=list)
    summary: str = ""
    ai_engine: str = ""
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)


class LiveEvent(BaseModel):
    id: str
    kind: str
    message: str
    timestamp: str
    severity: Optional[str] = None
    related_id: Optional[str] = None


class StatsResponse(BaseModel):
    documents_processed: int
    claims_extracted: int
    discrepancies_detected: int
    critical_count: int
    review_completion: int
    items_remaining: int
    sources: int


class AppRole(str, Enum):
    analyst = "analyst"
    reviewer = "reviewer"
    admin = "admin"
    executive = "executive"


class UserSignupRequest(BaseModel):
    name: Optional[str] = None
    email: str
    phone: Optional[str] = None
    password: str
    role: Optional[str] = "analyst"
    username: Optional[str] = None


class UserLoginRequest(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    identifier: Optional[str] = None
    username: Optional[str] = None
    password: str


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user: UserResponse
    name: Optional[str] = None
    email: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    name: str
    email: str
    role: Role


class StatusUpdate(BaseModel):
    status: DiscrepancyStatus


class GraphNode(BaseModel):
    id: str
    label: str
    kind: str
    x: float
    y: float
    severity: Optional[str] = None
    related_ids: List[str] = Field(default_factory=list)


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    kind: str


class GraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]


class Provenance(BaseModel):
    file_name: str
    file_hash: str
    temp_path: Optional[str] = None
    parser_used: str
    file_size_bytes: int
    mime_type: str
    ingested_at: str
    storage_type: str = "ephemeral_temp"


class EvidenceObject(BaseModel):
    id: str = Field(default_factory=lambda: f"ev-{uuid4().hex[:8]}")
    source: str
    modality: str
    claim: str
    entity: Optional[str] = None
    value: Optional[float] = None
    date: Optional[str] = None
    version: str = "1.0"
    location: Optional[str] = None
    provenance: Provenance
    raw_text_preview: Optional[str] = None
    metadata: dict = Field(default_factory=dict)


# ==========================================
# Memory Vault Schemas
# ==========================================
class VaultSetupPinRequest(BaseModel):
    pin: str = Field(..., min_length=4, max_length=6, description="4 to 6 digit numeric PIN")


class VaultUnlockRequest(BaseModel):
    pin: str = Field(..., min_length=4, max_length=6, description="4 to 6 digit numeric PIN")


class VaultResetPinRequest(BaseModel):
    password: str = Field(..., min_length=1, description="Account password for identity verification")
    new_pin: str = Field(..., min_length=4, max_length=6, description="New 4 to 6 digit numeric PIN")


class VaultStatusResponse(BaseModel):
    has_pin: bool
    is_locked: bool
    locked_until: Optional[datetime] = None
    remaining_attempts: int
    lockout_seconds_remaining: Optional[int] = None


class VaultUnlockResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int = 15
    message: str = "Vault unlocked successfully"


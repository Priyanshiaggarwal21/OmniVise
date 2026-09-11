from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
except ImportError:
    pass

from app.api.v1 import activity, audit, decisions, evidence, ingest, live_guard, notifications, workspace
from app.auth import router as auth_router
from app.core.database import Base, engine

# Ensure all ORM tables exist (no-op if already present)
import app.models  # noqa: F401 — registers models with Base metadata
Base.metadata.create_all(bind=engine)

app = FastAPI(title="OmniVise Audit Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Authentication routes mounted at /auth and /api/v1/auth for compatibility
app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(auth_router, prefix="/api/v1/auth", tags=["Authentication"])

app.include_router(ingest.router, prefix="/api/v1/ingest", tags=["Ingestion"])
app.include_router(audit.router, prefix="/api/v1/audit", tags=["Audit"])
app.include_router(live_guard.router, prefix="/api/v1/live", tags=["Live"])
app.include_router(evidence.router, prefix="/evidence", tags=["Evidence"])
app.include_router(evidence.router, prefix="/api/v1/evidence", tags=["Evidence"])
app.include_router(workspace.router, prefix="/workspace", tags=["Workspace"])
app.include_router(workspace.router, prefix="/api/v1/workspace", tags=["Workspace"])
app.include_router(decisions.router, prefix="/decisions", tags=["Decisions"])
app.include_router(decisions.router, prefix="/api/v1/decisions", tags=["Decisions"])
app.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["Notifications"])
app.include_router(activity.router, prefix="/activity", tags=["Activity"])
app.include_router(activity.router, prefix="/api/v1/activity", tags=["Activity"])


@app.get("/")
def read_root():
    return {"status": "OmniVise Backend Online"}


@app.get("/health")
def health():
    return {"ok": True}

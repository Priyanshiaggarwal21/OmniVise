from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.api.v1 import activity, audit, decisions, evidence, ingest, live_guard, notifications, session, vault, workspace
from app.auth import router as auth_router
from app.core.config import ENFORCE_HTTPS
from app.core.database import Base, engine, ensure_db_schema
from app.services.cleanup import (
    ensure_temp_directories,
    start_cleanup_scheduler,
    stop_cleanup_scheduler,
)

# Ensure all ORM tables exist (no-op if already present)
import app.models  # noqa: F401 — registers models with Base metadata
Base.metadata.create_all(bind=engine)
ensure_db_schema()
ensure_temp_directories()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start background cleanup scheduler
    start_cleanup_scheduler()
    yield
    # Shutdown: Stop background cleanup daemon
    stop_cleanup_scheduler()


app = FastAPI(title="OmniVise Audit Engine", lifespan=lifespan)

# Enforce security headers & HTTPS assumptions
@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    # Enforce HTTPS redirection if configured
    if ENFORCE_HTTPS:
        proto = request.headers.get("x-forwarded-proto", request.url.scheme)
        if proto == "http":
            secure_url = request.url.replace(scheme="https")
            return RedirectResponse(url=str(secure_url), status_code=301)

    response = await call_next(request)

    # Security Headers for SOC2 & OWASP Top 10 compliance
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"

    return response


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

app.include_router(vault.router, prefix="/vault", tags=["Vault"])
app.include_router(vault.router, prefix="/api/v1/vault", tags=["Vault"])

app.include_router(session.router, prefix="/session", tags=["Session"])
app.include_router(session.router, prefix="/api/v1/session", tags=["Session"])


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

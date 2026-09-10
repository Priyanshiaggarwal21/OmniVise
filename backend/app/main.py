from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
except ImportError:
    pass

from app.api.v1 import audit, ingest, live_guard
from app.auth import authenticate
from app.schemas import LoginRequest

app = FastAPI(title="OmniVise Audit Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest.router, prefix="/api/v1/ingest", tags=["Ingestion"])
app.include_router(audit.router, prefix="/api/v1/audit", tags=["Audit"])
app.include_router(live_guard.router, prefix="/api/v1/live", tags=["Live"])


@app.get("/")
def read_root():
    return {"status": "OmniVise Backend Online"}


@app.post("/api/v1/auth/login")
def login(payload: LoginRequest):
    return authenticate(payload)


@app.get("/health")
def health():
    return {"ok": True}

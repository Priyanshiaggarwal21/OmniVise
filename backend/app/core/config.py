import os
from pathlib import Path
from dotenv import load_dotenv

# Ensure .env is loaded from backend directory
env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(env_path)
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./omnivise.db")

JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("CRITICAL SECURITY ERROR: JWT_SECRET environment variable is not set.")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# At-rest encryption key for sensitive tables (Fernet 32-byte base64)
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")
if not ENCRYPTION_KEY:
    # Deterministic development fallback if not configured, with strict warning
    import base64
    import hashlib
    print("WARNING: ENCRYPTION_KEY is not set. Generating key derived from JWT_SECRET.")
    derived = hashlib.sha256(JWT_SECRET.encode()).digest()
    ENCRYPTION_KEY = base64.urlsafe_b64encode(derived).decode()

# Security & TLS flags
ENFORCE_HTTPS = os.getenv("ENFORCE_HTTPS", "false").strip().lower() in ("true", "1", "yes")

# Automated session cleanup interval (minutes)
SESSION_CLEANUP_INTERVAL_MINUTES = int(os.getenv("SESSION_CLEANUP_INTERVAL_MINUTES", "60"))

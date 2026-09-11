import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Load environment variables
env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(env_path)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is not set.")

# SQLite requires check_same_thread=False for multi-threaded FastAPI access
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def ensure_db_schema():
    """Ensure any newly added columns exist in the SQLite database without requiring recreation."""
    try:
        from sqlalchemy import inspect, text
        inspector = inspect(engine)
        if "users" in inspector.get_table_names():
            columns = [c["name"] for c in inspector.get_columns("users")]
            with engine.connect() as conn:
                if "vault_pin_hash" not in columns:
                    conn.execute(text("ALTER TABLE users ADD COLUMN vault_pin_hash VARCHAR"))
                if "vault_failed_attempts" not in columns:
                    conn.execute(text("ALTER TABLE users ADD COLUMN vault_failed_attempts INTEGER DEFAULT 0"))
                if "vault_locked_until" not in columns:
                    conn.execute(text("ALTER TABLE users ADD COLUMN vault_locked_until DATETIME"))
                conn.commit()
    except Exception as exc:
        print(f"Warning during DB schema sync: {exc}")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


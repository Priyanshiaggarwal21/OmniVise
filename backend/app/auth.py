import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Callable, List, Optional, Set, Union

import bcrypt
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from sqlalchemy.orm import Session

from app.core.database import Base, engine, get_db
from app.models.user import User
from app.schemas import (
    AppRole,
    AuthTokenResponse,
    LoginRequest,
    Role,
    TokenResponse,
    UserLoginRequest,
    UserResponse,
    UserSignupRequest,
)

# Load environment variables
env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(env_path)
load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET environment variable is not set.")

JWT_ALG = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24
security = HTTPBearer(auto_error=False)

# Ensure database tables exist
Base.metadata.create_all(bind=engine)

router = APIRouter(tags=["Authentication"])

ALLOWED_ROLES = {"analyst", "reviewer", "admin", "executive", "auditor", "viewer"}


# ==========================================
# Password Hashing Utilities (passlib / bcrypt)
# ==========================================
def hash_password(password: str) -> str:
    """Hash password using bcrypt with standard 72-byte safe handling."""
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against bcrypt hash, with passlib fallback."""
    try:
        pwd_bytes = plain_password.encode("utf-8")[:72]
        return bcrypt.checkpw(
            pwd_bytes,
            hashed_password.encode("utf-8"),
        )
    except Exception:
        try:
            from passlib.context import CryptContext
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
            return pwd_context.verify(plain_password[:72], hashed_password)
        except Exception:
            return False


# ==========================================
# JWT Token Utilities
# ==========================================
def create_access_token(
    user_id: str,
    email: str,
    name: str,
    role: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)

    payload = {
        "sub": email,
        "user_id": user_id,
        "name": name,
        "email": email,
        "role": role.lower(),
        "exp": expire,
        "iat": now,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


# ==========================================
# Authentication & Reusable RBAC Dependencies
# ==========================================
def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_token(credentials.credentials)
    user_id = payload.get("user_id")
    email = payload.get("email") or payload.get("sub")

    user = None
    if user_id:
        user = db.query(User).filter(User.id == user_id).first()
    if not user and email:
        user = db.query(User).filter(User.email == email.lower().strip()).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with token no longer exists",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> Optional[User]:
    if not credentials or not credentials.credentials:
        return None
    try:
        return get_current_user(credentials, db)
    except HTTPException:
        return None


class RoleGuard:
    """Reusable role-based access guard dependency.
    
    Can be used in route dependencies or parameters:
        user: User = Depends(RoleGuard("admin"))
        user: User = Depends(require_role("analyst", "reviewer"))
    """

    def __init__(self, *allowed_roles: str):
        self.allowed_roles: Set[str] = {r.lower().strip() for r in allowed_roles}

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        user_role = (current_user.role or "").lower().strip()
        if user_role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Role '{current_user.role}' is not authorized. Allowed roles: {sorted(list(self.allowed_roles))}",
            )
        return current_user


def require_role(*allowed_roles: str) -> RoleGuard:
    """Convenient factory returning a reusable RoleGuard dependency."""
    return RoleGuard(*allowed_roles)


# Convenient pre-configured role guards
require_admin = require_role("admin")
require_reviewer = require_role("reviewer", "admin")
require_analyst = require_role("analyst", "reviewer", "admin")
require_executive = require_role("executive", "admin")
require_write = require_role("admin", "reviewer", "analyst", "auditor")


# ==========================================
# Auth Endpoints (/auth/...)
# ==========================================
@router.post("/signup", response_model=AuthTokenResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: UserSignupRequest, db: Session = Depends(get_db)):
    email_clean = payload.email.lower().strip()
    role_clean = (payload.role or "analyst").lower().strip()
    name_clean = (payload.name or payload.username or email_clean.split("@")[0]).strip()

    if role_clean not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role '{payload.role}'. Must be one of: {sorted(list(ALLOWED_ROLES))}",
        )

    # Check for existing email
    existing_user = db.query(User).filter(User.email == email_clean).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists",
        )

    # Check for existing phone if provided
    phone_clean = payload.phone.strip() if payload.phone else None
    if phone_clean:
        existing_phone = db.query(User).filter(User.phone == phone_clean).first()
        if existing_phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this phone number already exists",
            )

    new_user = User(
        id=str(uuid.uuid4()),
        name=name_clean,
        email=email_clean,
        phone=phone_clean,
        password_hash=hash_password(payload.password),
        role=role_clean,
        created_at=datetime.now(timezone.utc),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(
        user_id=new_user.id,
        email=new_user.email,
        name=new_user.name,
        role=new_user.role,
    )

    user_resp = UserResponse.model_validate(new_user)

    return AuthTokenResponse(
        access_token=token,
        token_type="bearer",
        role=new_user.role,
        name=new_user.name,
        email=new_user.email,
        user=user_resp,
    )


@router.post("/login", response_model=AuthTokenResponse)
def login(payload: UserLoginRequest, db: Session = Depends(get_db)):
    search_term = (payload.identifier or payload.email or payload.username or payload.phone or "").strip()
    if not search_term:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email, mobile number, or identifier required",
        )

    user = (
        db.query(User)
        .filter(
            (User.email == search_term.lower())
            | (User.phone == search_term)
            | (User.name == search_term)
        )
        .first()
    )

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email/mobile number or password",
        )

    token = create_access_token(
        user_id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
    )

    user_resp = UserResponse.model_validate(user)

    return AuthTokenResponse(
        access_token=token,
        token_type="bearer",
        role=user.role,
        name=user.name,
        email=user.email,
        user=user_resp,
    )


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    return {
        "status": "success",
        "message": f"User {current_user.email} logged out successfully",
    }


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


# ==========================================
# Legacy compatibility helper
# ==========================================
def authenticate(payload: LoginRequest) -> TokenResponse:
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
        if not user or not verify_password(payload.password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        token = create_access_token(user_id=user.id, email=user.email, name=user.name, role=user.role)
        role_enum = Role.admin if user.role == "admin" else Role.auditor if user.role == "reviewer" else Role.viewer
        return TokenResponse(access_token=token, name=user.name, email=user.email, role=role_enum)
    finally:
        db.close()


__all__ = [
    "router",
    "hash_password",
    "verify_password",
    "create_access_token",
    "decode_token",
    "get_current_user",
    "get_optional_user",
    "RoleGuard",
    "require_role",
    "require_admin",
    "require_reviewer",
    "require_analyst",
    "require_executive",
    "require_write",
    "authenticate",
]

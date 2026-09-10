import os
from datetime import datetime, timedelta
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.schemas import LoginRequest, Role, TokenResponse

JWT_SECRET = os.getenv("JWT_SECRET", "omnivise-dev-secret-change-me")
JWT_ALG = "HS256"
security = HTTPBearer(auto_error=False)

DEMO_USERS = {
    "admin@omnivise.ai": {
        "password": "admin123",
        "name": "Priyanshi Aggarwal",
        "role": Role.admin,
    },
    "auditor@omnivise.ai": {
        "password": "audit123",
        "name": "Alex Chen",
        "role": Role.auditor,
    },
    "viewer@omnivise.ai": {
        "password": "view123",
        "name": "Jordan Hale",
        "role": Role.viewer,
    },
}

WRITE_ROLES = {Role.admin, Role.auditor}


def authenticate(payload: LoginRequest) -> TokenResponse:
    user = DEMO_USERS.get(payload.email.lower().strip())
    if not user or user["password"] != payload.password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = jwt.encode(
        {
            "sub": payload.email.lower().strip(),
            "name": user["name"],
            "role": user["role"].value,
            "exp": datetime.utcnow() + timedelta(hours=12),
        },
        JWT_SECRET,
        algorithm=JWT_ALG,
    )
    return TokenResponse(access_token=token, name=user["name"], email=payload.email.lower().strip(), role=user["role"])


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token") from exc


def get_optional_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[dict]:
    if not credentials:
        return None
    return decode_token(credentials.credentials)


def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> dict:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    return decode_token(credentials.credentials)


def require_write(user: dict = Depends(get_current_user)) -> dict:
    role = Role(user.get("role"))
    if role not in WRITE_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Viewer role is read-only")
    return user

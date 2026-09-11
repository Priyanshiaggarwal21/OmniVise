from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import jwt
from fastapi import APIRouter, Depends, HTTPException, Header, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.api.v1.activity import log_activity
from app.auth import (
    JWT_ALG,
    JWT_SECRET,
    get_current_user,
    hash_password,
    verify_password,
)
from app.core.database import get_db
from app.models.decision_snapshot import DecisionSnapshot
from app.models.user import User
from app.schemas import (
    VaultResetPinRequest,
    VaultSetupPinRequest,
    VaultStatusResponse,
    VaultUnlockRequest,
    VaultUnlockResponse,
)

router = APIRouter()

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15
VAULT_TOKEN_EXPIRE_MINUTES = 15

vault_security = HTTPBearer(auto_error=False)


# ==========================================
# Vault Token Generation & Verification
# ==========================================
def create_vault_token(user_id: str, email: str, expires_minutes: int = VAULT_TOKEN_EXPIRE_MINUTES) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=expires_minutes)
    payload = {
        "sub": email,
        "user_id": user_id,
        "type": "vault_access",
        "exp": expire,
        "iat": now,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def verify_vault_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        if payload.get("type") != "vault_access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid vault access token",
            )
        return payload
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Vault session has expired. Please unlock again.",
        ) from exc
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid vault access token",
        ) from exc


# ==========================================
# Endpoints
# ==========================================
@router.get("/status", response_model=VaultStatusResponse)
def get_vault_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Check if the user has configured a Vault PIN, whether the vault is locked out,
    and how many retry attempts remain before temporary lockout.
    """
    now = datetime.now(timezone.utc)
    is_locked = False
    lockout_seconds_remaining = None

    # Check if currently in lockout period
    if current_user.vault_locked_until:
        # SQLite might return naive or aware datetime
        locked_until = current_user.vault_locked_until
        if locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)

        if locked_until > now:
            is_locked = True
            lockout_seconds_remaining = max(1, int((locked_until - now).total_seconds()))
        else:
            # Lockout expired: auto-reset
            current_user.vault_locked_until = None
            current_user.vault_failed_attempts = 0
            db.commit()

    failed_attempts = current_user.vault_failed_attempts or 0
    remaining_attempts = 0 if is_locked else max(0, MAX_FAILED_ATTEMPTS - failed_attempts)

    return VaultStatusResponse(
        has_pin=bool(current_user.vault_pin_hash),
        is_locked=is_locked,
        locked_until=current_user.vault_locked_until if is_locked else None,
        remaining_attempts=remaining_attempts,
        lockout_seconds_remaining=lockout_seconds_remaining,
    )


@router.post("/setup-pin", response_model=VaultUnlockResponse)
def setup_pin(
    payload: VaultSetupPinRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    First-time PIN setup for the Memory Vault.
    Validates numeric PIN and initializes secure vault hash.
    """
    pin = payload.pin.strip()
    if not pin.isdigit() or len(pin) not in (4, 5, 6):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PIN must be a 4 to 6 digit numeric code.",
        )

    if current_user.vault_pin_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vault PIN is already configured. Use the Reset PIN option to change your PIN.",
        )

    current_user.vault_pin_hash = hash_password(pin)
    current_user.vault_failed_attempts = 0
    current_user.vault_locked_until = None
    db.commit()

    # Log audit activity
    try:
        log_activity(
            db,
            action_type="vault_pin_setup",
            target="Memory Vault PIN configured",
            user_id=current_user.id,
            details={"email": current_user.email},
        )
    except Exception:
        pass

    token = create_vault_token(current_user.id, current_user.email)

    return VaultUnlockResponse(
        access_token=token,
        token_type="bearer",
        expires_in_minutes=VAULT_TOKEN_EXPIRE_MINUTES,
        message="Memory Vault PIN configured and unlocked.",
    )


@router.post("/unlock", response_model=VaultUnlockResponse)
def unlock_vault(
    payload: VaultUnlockRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Verify PIN and return a short-lived vault-access token.
    Enforces retry-limit lockout (5 failed attempts -> 15 min lockout).
    """
    pin = payload.pin.strip()

    if not current_user.vault_pin_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Memory Vault PIN is not set. Please set up a PIN first.",
        )

    now = datetime.now(timezone.utc)

    # Check active lockout
    if current_user.vault_locked_until:
        locked_until = current_user.vault_locked_until
        if locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)

        if locked_until > now:
            remaining_secs = max(1, int((locked_until - now).total_seconds()))
            remaining_mins = max(1, (remaining_secs + 59) // 60)
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail=f"Vault is locked due to repeated wrong attempts. Try again in {remaining_mins} minute(s) ({remaining_secs} seconds).",
            )
        else:
            # Lockout expired: reset
            current_user.vault_locked_until = None
            current_user.vault_failed_attempts = 0
            db.commit()

    # Verify PIN
    if not verify_password(pin, current_user.vault_pin_hash):
        current_user.vault_failed_attempts = (current_user.vault_failed_attempts or 0) + 1
        attempts_left = max(0, MAX_FAILED_ATTEMPTS - current_user.vault_failed_attempts)

        if attempts_left <= 0:
            current_user.vault_locked_until = now + timedelta(minutes=LOCKOUT_MINUTES)
            db.commit()
            try:
                log_activity(
                    db,
                    action_type="vault_lockout",
                    target=f"Vault locked out for {LOCKOUT_MINUTES} minutes",
                    user_id=current_user.id,
                    details={"email": current_user.email, "lockout_minutes": LOCKOUT_MINUTES},
                )
            except Exception:
                pass

            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail=f"Incorrect PIN. Vault locked for {LOCKOUT_MINUTES} minutes due to repeated wrong attempts.",
            )

        db.commit()
        try:
            log_activity(
                db,
                action_type="vault_unlock_failed",
                target=f"Incorrect PIN attempt ({attempts_left} attempts remaining)",
                user_id=current_user.id,
                details={"email": current_user.email, "attempts_left": attempts_left},
            )
        except Exception:
            pass

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Incorrect PIN. {attempts_left} attempt{'s' if attempts_left > 1 else ''} remaining before temporary lockout.",
        )

    # Correct PIN: reset failures
    current_user.vault_failed_attempts = 0
    current_user.vault_locked_until = None
    db.commit()

    try:
        log_activity(
            db,
            action_type="vault_unlocked",
            target="Memory Vault unlocked successfully",
            user_id=current_user.id,
            details={"email": current_user.email},
        )
    except Exception:
        pass

    token = create_vault_token(current_user.id, current_user.email)

    return VaultUnlockResponse(
        access_token=token,
        token_type="bearer",
        expires_in_minutes=VAULT_TOKEN_EXPIRE_MINUTES,
        message="Memory Vault unlocked successfully.",
    )


@router.post("/reset-pin", response_model=VaultUnlockResponse)
def reset_pin(
    payload: VaultResetPinRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Reset Vault PIN after re-verifying account credentials (user's login password).
    Clears any active lockouts and immediately provisions the new PIN.
    """
    if not payload.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account password is required for credential re-verification.",
        )

    if not verify_password(payload.password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid account password. Credential verification failed.",
        )

    new_pin = payload.new_pin.strip()
    if not new_pin.isdigit() or len(new_pin) not in (4, 5, 6):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New PIN must be a 4 to 6 digit numeric code.",
        )

    current_user.vault_pin_hash = hash_password(new_pin)
    current_user.vault_failed_attempts = 0
    current_user.vault_locked_until = None
    db.commit()

    try:
        log_activity(
            db,
            action_type="vault_pin_reset",
            target="Memory Vault PIN reset with re-verified credentials",
            user_id=current_user.id,
            details={"email": current_user.email},
        )
    except Exception:
        pass

    token = create_vault_token(current_user.id, current_user.email)

    return VaultUnlockResponse(
        access_token=token,
        token_type="bearer",
        expires_in_minutes=VAULT_TOKEN_EXPIRE_MINUTES,
        message="Memory Vault PIN reset successfully and vault unlocked.",
    )


@router.get("/snapshots")
def get_vault_snapshots(
    x_vault_token: Optional[str] = Header(None, alias="X-Vault-Token"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve persistent past projects and decision snapshots securely from the Memory Vault.
    Requires that the vault is configured and either verified via X-Vault-Token or active session.
    """
    if not current_user.vault_pin_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Memory Vault is not initialized. Please set up a PIN first.",
        )

    if x_vault_token:
        try:
            verify_vault_token(x_vault_token)
        except HTTPException:
            # Token invalid or expired
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Vault access session expired or invalid. Please re-enter your PIN.",
            )

    snapshots = (
        db.query(DecisionSnapshot)
        .order_by(DecisionSnapshot.created_at.desc())
        .all()
    )

    return {
        "snapshots": snapshots,
        "total": len(snapshots),
        "user": {
            "name": current_user.name,
            "email": current_user.email,
            "role": current_user.role,
        },
    }

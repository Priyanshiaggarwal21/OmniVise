from __future__ import annotations

import json
from typing import Any, Optional
from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy import Text
from sqlalchemy.types import TypeDecorator

from app.core.config import ENCRYPTION_KEY

# Initialize Fernet cipher suite
try:
    _cipher = Fernet(ENCRYPTION_KEY.encode() if isinstance(ENCRYPTION_KEY, str) else ENCRYPTION_KEY)
except Exception as exc:
    raise RuntimeError(f"Invalid ENCRYPTION_KEY configured: {exc}")


def encrypt_text(plaintext: Optional[str]) -> Optional[str]:
    """Encrypt plaintext string using Fernet authenticated symmetric encryption (AES-128-CBC + HMAC)."""
    if plaintext is None:
        return None
    if not isinstance(plaintext, str):
        plaintext = str(plaintext)
    encrypted_bytes = _cipher.encrypt(plaintext.encode("utf-8"))
    return encrypted_bytes.decode("utf-8")


def decrypt_text(ciphertext: Optional[str]) -> Optional[str]:
    """Decrypt ciphertext string. If plaintext (not encrypted or legacy), returns as-is."""
    if ciphertext is None:
        return None
    if not isinstance(ciphertext, str):
        return str(ciphertext)

    # Fast check if it looks like Fernet token (starts with gAAAAA)
    if not ciphertext.startswith("gAAAAA"):
        return ciphertext

    try:
        decrypted_bytes = _cipher.decrypt(ciphertext.encode("utf-8"))
        return decrypted_bytes.decode("utf-8")
    except (InvalidToken, Exception):
        # Fallback to returning original string in case of plain text
        return ciphertext


def encrypt_json(data: Any) -> Optional[str]:
    """Serialise Python data to JSON and encrypt."""
    if data is None:
        return None
    json_str = json.dumps(data, default=str)
    return encrypt_text(json_str)


def decrypt_json(ciphertext: Optional[str]) -> Any:
    """Decrypt ciphertext and parse back into Python data structure."""
    if ciphertext is None:
        return None
    plain = decrypt_text(ciphertext)
    if not plain:
        return None
    try:
        return json.loads(plain)
    except Exception:
        return plain


class EncryptedText(TypeDecorator):
    """SQLAlchemy TypeDecorator that transparently encrypts data at-rest before writing to SQLite/PostgreSQL,

    and decrypts it upon retrieval.
    """

    impl = Text
    cache_ok = True

    def process_bind_param(self, value: Optional[str], dialect) -> Optional[str]:
        if value is None:
            return None
        return encrypt_text(value)

    def process_result_value(self, value: Optional[str], dialect) -> Optional[str]:
        if value is None:
            return None
        return decrypt_text(value)


class EncryptedJSON(TypeDecorator):
    """SQLAlchemy TypeDecorator that serialises JSON and encrypts at-rest."""

    impl = Text
    cache_ok = True

    def process_bind_param(self, value: Any, dialect) -> Optional[str]:
        if value is None:
            return None
        return encrypt_json(value)

    def process_result_value(self, value: Optional[str], dialect) -> Any:
        if value is None:
            return None
        return decrypt_json(value)

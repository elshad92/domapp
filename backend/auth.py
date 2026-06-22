"""
JWT authentication for management companies and internal API key checks for the bot.
Supports access + refresh tokens.
"""

from __future__ import annotations

import hmac
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import Depends, Header, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)
security = HTTPBearer()

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = "HS256"
JWT_ACCESS_EXPIRE_HOURS = 24 * 7  # 7 дней
JWT_REFRESH_EXPIRE_DAYS = 30      # 30 дней

if not JWT_SECRET:
    raise RuntimeError(
        "JWT_SECRET environment variable is not set! "
        "Set a strong secret in .env or environment before starting the server."
    )


def create_token(company_id: int, company_name: str) -> str:
    """Создать access token."""
    payload = {
        "company_id": company_id,
        "company_name": company_name,
        "type": "access",
        "jti": str(uuid.uuid4()),
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_ACCESS_EXPIRE_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(company_id: int) -> str:
    """Создать refresh token."""
    payload = {
        "company_id": company_id,
        "type": "refresh",
        "jti": str(uuid.uuid4()),
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_REFRESH_EXPIRE_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=401, detail="Token expired") from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc

    if "company_id" not in payload:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    return payload


def get_current_company(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Получить текущую компанию из access token."""
    payload = decode_token(credentials.credentials)
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Access token required")
    return payload


def verify_internal_key(x_internal_key: Optional[str] = Header(default=None)) -> bool:
    expected = os.getenv("INTERNAL_API_KEY", "")
    if not expected or not x_internal_key or not hmac.compare_digest(x_internal_key, expected):
        raise HTTPException(status_code=403, detail="Invalid internal key")
    return True

"""
DomApp — Auth router
POST /api/v1/auth/register    — регистрация УК
POST /api/v1/auth/login       — вход, получение JWT
"""

import logging
import bcrypt as bcrypt_lib
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from passlib.hash import pbkdf2_sha256

from backend.db import get_supabase
from backend.auth import create_token

logger = logging.getLogger(__name__)
router = APIRouter(tags=["auth"])


def _hash_password(password: str) -> str:
    return pbkdf2_sha256.hash(password)


def _verify_password(password: str, password_hash: str) -> bool:
    if pbkdf2_sha256.identify(password_hash):
        return pbkdf2_sha256.verify(password, password_hash)
    if password_hash.startswith(("$2a$", "$2b$", "$2y$")):
        try:
            return bcrypt_lib.checkpw(password.encode("utf-8")[:72], password_hash.encode("utf-8"))
        except ValueError:
            return False
    return False


class RegisterRequest(BaseModel):
    name: str
    phone: str
    email: str
    password: str
    plan: str = "start"


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    token: str
    company_id: int
    company_name: str
    plan: str


@router.post("/auth/register", response_model=AuthResponse)
async def register(data: RegisterRequest):
    supabase = get_supabase()

    # Проверка — нет ли уже такого email
    existing = (
        supabase.table("companies")
        .select("id")
        .eq("email", data.email)
        .maybe_single()
        .execute()
    )
    if existing.data:
        raise HTTPException(status_code=400, detail="Email уже зарегистрирован")

    hashed = _hash_password(data.password)

    # Создаём компанию
    result = (
        supabase.table("companies")
        .insert({
            "name": data.name,
            "phone": data.phone,
            "email": data.email,
            "password_hash": hashed,
            "plan": data.plan,
        })
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=400, detail="Ошибка регистрации")

    company = result.data[0]
    token = create_token(company["id"], company["name"], company["plan"])
    logger.info("Company registered: id=%s, email=%s, plan=%s", company["id"], data.email, company["plan"])

    return AuthResponse(
        token=token,
        company_id=company["id"],
        company_name=company["name"],
        plan=company["plan"],
    )


@router.post("/auth/login", response_model=AuthResponse)
async def login(data: LoginRequest):
    supabase = get_supabase()

    result = (
        supabase.table("companies")
        .select("*")
        .eq("email", data.email)
        .maybe_single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=401, detail="Неверный email или пароль")

    company = result.data

    if not _verify_password(data.password, company["password_hash"]):
        raise HTTPException(status_code=401, detail="Неверный email или пароль")

    token = create_token(company["id"], company["name"], company["plan"])
    logger.info("Company logged in: id=%s, email=%s, plan=%s", company["id"], data.email, company["plan"])

    return AuthResponse(
        token=token,
        company_id=company["id"],
        company_name=company["name"],
        plan=company["plan"],
    )

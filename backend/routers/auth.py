"""
DomApp — Auth router
POST /api/v1/auth/register — регистрация УК
POST /api/v1/auth/login    — вход, получение JWT
"""

import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.db import get_supabase
from backend.auth import create_token

logger = logging.getLogger(__name__)
router = APIRouter(tags=["auth"])


class RegisterRequest(BaseModel):
    name: str
    phone: str
    email: str
    password: str
    plan: str = "basic"


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    token: str
    company_id: int
    company_name: str


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

    # Хешируем пароль (passlib с bcrypt)
    from passlib.hash import bcrypt
    hashed = bcrypt.hash(data.password)

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
    token = create_token(company["id"], company["name"])
    logger.info("Company registered: id=%s, email=%s", company["id"], data.email)

    return AuthResponse(
        token=token,
        company_id=company["id"],
        company_name=company["name"],
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

    # Проверяем пароль
    from passlib.hash import bcrypt
    if not bcrypt.verify(data.password, company["password_hash"]):
        raise HTTPException(status_code=401, detail="Неверный email или пароль")

    token = create_token(company["id"], company["name"])
    logger.info("Company logged in: id=%s, email=%s", company["id"], data.email)

    return AuthResponse(
        token=token,
        company_id=company["id"],
        company_name=company["name"],
    )

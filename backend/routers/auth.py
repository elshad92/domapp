"""
DomApp — Auth router
POST /api/v1/auth/register    — регистрация УК
POST /api/v1/auth/login       — вход, получение JWT
POST /api/v1/auth/demo-login  — демо-доступ
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
    token = create_token(company["id"], company["name"], company["plan"])
    logger.info("Company registered: id=%s, email=%s, plan=%s", company["id"], data.email, company["plan"])

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

    token = create_token(company["id"], company["name"], company["plan"])
    logger.info("Company logged in: id=%s, email=%s, plan=%s", company["id"], data.email, company["plan"])

    return AuthResponse(
        token=token,
        company_id=company["id"],
        company_name=company["name"],
    )


@router.post("/auth/demo-login", response_model=AuthResponse)
async def demo_login():
    """Авторизация в демо-режиме. Создаёт временную компанию с предзаполненными данными."""
    supabase = get_supabase()

    # Ищем или создаём демо-компанию
    existing = (
        supabase.table("companies")
        .select("*")
        .eq("email", "demo@domapp.uz")
        .maybe_single()
        .execute()
    )

    if existing.data:
        company = existing.data
        token = create_token(company["id"], company["name"], company["plan"])
        logger.info("Demo login: company_id=%s", company["id"])
        return AuthResponse(
            token=token,
            company_id=company["id"],
            company_name=company["name"],
        )

    # Создаём демо-компанию
    from passlib.hash import bcrypt
    hashed = bcrypt.hash("demo123456")
    result = (
        supabase.table("companies")
        .insert({
            "name": "Демо УК",
            "phone": "+998901234567",
            "email": "demo@domapp.uz",
            "password_hash": hashed,
            "plan": "premium",
        })
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=400, detail="Ошибка создания демо-компании")

    company = result.data[0]
    token = create_token(company["id"], company["name"], company["plan"])
    logger.info("Demo company created: id=%s", company["id"])

    return AuthResponse(
        token=token,
        company_id=company["id"],
        company_name=company["name"],
    )

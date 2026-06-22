"""
DomApp — Resident Auth router
POST /api/v1/resident/auth/send-code  — отправить SMS с кодом
POST /api/v1/resident/auth/verify-code — подтвердить код и получить JWT
"""

import logging
import os
import random
import uuid
from datetime import datetime, timedelta, timezone

import httpx
import jwt
from fastapi import APIRouter, HTTPException
from dotenv import load_dotenv
from pydantic import BaseModel, Field

from backend.db import get_supabase
from backend.models.schemas import ResidentLoginRequest, ResidentLoginResponse

load_dotenv()

logger = logging.getLogger(__name__)
router = APIRouter(tags=["resident_auth"])

# Используем тот же JWT_SECRET, но с префиксом resident_
RESIDENT_JWT_EXPIRE_DAYS = 30

# SMS code store (in-memory; для production заменить на Redis/DB)
_sms_codes: dict[str, dict] = {}
SMS_CODE_EXPIRE_MINUTES = 5


# === PlayMobile.uz SMS Gateway ===
PLAYMOBILE_URL = os.getenv("PLAYMOBILE_URL", "https://send.smsxabar.uz/broker-api/send")
PLAYMOBILE_LOGIN = os.getenv("PLAYMOBILE_LOGIN", "")
PLAYMOBILE_PASSWORD = os.getenv("PLAYMOBILE_PASSWORD", "")
PLAYMOBILE_ORIGINATOR = os.getenv("PLAYMOBILE_ORIGINATOR", "3700")


async def send_sms_via_playmobile(phone: str, code: str) -> bool:
    """
    Отправить SMS через PlayMobile.uz API.
    Если PLAYMOBILE_LOGIN не настроен — просто логируем код (режим разработки).
    """
    if not PLAYMOBILE_LOGIN or not PLAYMOBILE_PASSWORD:
        logger.info("🔐 [DEV MODE] SMS code for %s: %s", phone, code)
        return True

    payload = {
        "messages": [
            {
                "recipient": phone,
                "message-id": str(uuid.uuid4()),
                "sms": {
                    "originator": PLAYMOBILE_ORIGINATOR,
                    "content": {
                        "text": f"DomApp: ваш код подтверждения {code}. Действителен {SMS_CODE_EXPIRE_MINUTES} мин."
                    },
                },
            }
        ]
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                PLAYMOBILE_URL,
                json=payload,
                auth=(PLAYMOBILE_LOGIN, PLAYMOBILE_PASSWORD),
            )
            if resp.status_code == 200:
                logger.info("SMS sent to %s (code: %s)", phone, code)
                return True
            else:
                logger.error("PlayMobile error: %s %s", resp.status_code, resp.text)
                return False
    except Exception as e:
        logger.error("PlayMobile exception: %s", e)
        return False


# === Request/Response schemas ===


class SendCodeRequest(BaseModel):
    phone: str

    @classmethod
    def normalize_phone(cls, v: str) -> str:
        import re
        digits = re.sub(r"\D", "", v)
        if len(digits) == 12 and digits.startswith("998"):
            return f"+{digits}"
        if len(digits) == 9:
            return f"+998{digits}"
        if len(digits) == 11 and digits.startswith("8"):
            return f"+998{digits[1:]}"
        return v


class SendCodeResponse(BaseModel):
    success: bool
    message: str = ""


class VerifyCodeRequest(BaseModel):
    phone: str
    code: str


class VerifyCodeResponse(BaseModel):
    success: bool
    token: str = ""
    resident_id: int = 0
    name: str = ""
    phone: str = ""
    apartment_id: int = 0
    apartment_number: str | None = None
    building_id: int | None = None
    building_address: str | None = None


# === Token helpers ===


def create_resident_token(resident_id: int, name: str, phone: str) -> str:
    """Создать JWT для жильца."""
    from backend.auth import JWT_SECRET, JWT_ALGORITHM
    payload = {
        "resident_id": resident_id,
        "name": name,
        "phone": phone,
        "type": "resident_access",
        "jti": str(uuid.uuid4()),
        "exp": datetime.now(timezone.utc) + timedelta(days=RESIDENT_JWT_EXPIRE_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_resident_token(token: str) -> dict:
    """Декодировать JWT жильца."""
    from backend.auth import JWT_SECRET, JWT_ALGORITHM
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=401, detail="Token expired") from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc

    if payload.get("type") != "resident_access" or "resident_id" not in payload:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    return payload


# === Endpoints ===


@router.post("/resident/auth/send-code", response_model=SendCodeResponse)
async def send_code(data: SendCodeRequest):
    """
    Шаг 1: Отправить SMS с кодом подтверждения на номер телефона.
    """
    phone = SendCodeRequest.normalize_phone(data.phone)

    # Проверяем, существует ли жилец с таким телефоном
    db = get_supabase()
    result = db.table("residents").select("id").eq("phone", phone).maybe_single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Жилец с таким телефоном не найден")

    # Генерируем 6-значный код
    code = str(random.randint(100000, 999999))

    # Сохраняем код в памяти
    _sms_codes[phone] = {
        "code": code,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=SMS_CODE_EXPIRE_MINUTES),
    }

    # Отправляем SMS
    sent = await send_sms_via_playmobile(phone, code)
    if not sent and not (os.getenv("PLAYMOBILE_LOGIN") == "" or os.getenv("PLAYMOBILE_LOGIN") is None):
        raise HTTPException(status_code=502, detail="Не удалось отправить SMS")

    logger.info("SMS code sent to %s", phone)
    return SendCodeResponse(success=True, message="Код отправлен")


@router.post("/resident/auth/verify-code", response_model=VerifyCodeResponse)
async def verify_code(data: VerifyCodeRequest):
    """
    Шаг 2: Подтвердить код и получить JWT токен.
    """
    phone = SendCodeRequest.normalize_phone(data.phone)

    # Проверяем код
    stored = _sms_codes.get(phone)
    if not stored:
        raise HTTPException(status_code=400, detail="Код не запрашивался. Сначала отправьте код.")

    if datetime.now(timezone.utc) > stored["expires_at"]:
        del _sms_codes[phone]
        raise HTTPException(status_code=400, detail="Код истёк. Запросите новый.")

    if stored["code"] != data.code:
        raise HTTPException(status_code=400, detail="Неверный код подтверждения")

    # Код верный — удаляем из хранилища
    del _sms_codes[phone]

    # Получаем данные жильца
    db = get_supabase()
    result = db.table("residents").select("*").eq("phone", phone).maybe_single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Жилец не найден")

    resident = result.data

    # Получаем информацию о квартире и доме
    apartment_number = None
    building_id = None
    building_address = None

    apartment_id = resident.get("apartment_id")
    if apartment_id:
        apt = db.table("apartments").select("*").eq("id", apartment_id).maybe_single().execute()
        if apt.data:
            apartment_number = apt.data.get("number", "")
            building_id = apt.data.get("building_id")
            if building_id:
                bld = db.table("buildings").select("address").eq("id", building_id).maybe_single().execute()
                if bld.data:
                    building_address = bld.data.get("address", "")

    token = create_resident_token(
        resident_id=resident["id"],
        name=resident.get("name", ""),
        phone=phone,
    )

    logger.info("Resident logged in via SMS: id=%s phone=%s", resident["id"], phone)

    return VerifyCodeResponse(
        success=True,
        token=token,
        resident_id=resident["id"],
        name=resident.get("name", ""),
        phone=phone,
        apartment_id=apartment_id or 0,
        apartment_number=apartment_number,
        building_id=building_id,
        building_address=building_address,
    )


# === Legacy login (без SMS, для обратной совместимости) ===


@router.post("/resident/auth/login", response_model=ResidentLoginResponse)
async def resident_login(data: ResidentLoginRequest):
    """
    Вход жильца по номеру телефона (без SMS — для тестирования).
    """
    db = get_supabase()
    phone = data.phone

    result = db.table("residents").select("*").eq("phone", phone).maybe_single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Жилец с таким телефоном не найден")

    resident = result.data

    apartment_number = None
    building_id = None
    building_address = None

    apartment_id = resident.get("apartment_id")
    if apartment_id:
        apt = db.table("apartments").select("*").eq("id", apartment_id).maybe_single().execute()
        if apt.data:
            apartment_number = apt.data.get("number", "")
            building_id = apt.data.get("building_id")
            if building_id:
                bld = db.table("buildings").select("address").eq("id", building_id).maybe_single().execute()
                if bld.data:
                    building_address = bld.data.get("address", "")

    token = create_resident_token(
        resident_id=resident["id"],
        name=resident.get("name", ""),
        phone=phone,
    )

    logger.info("Resident logged in (legacy): id=%s phone=%s", resident["id"], phone)

    return ResidentLoginResponse(
        token=token,
        resident_id=resident["id"],
        name=resident.get("name", ""),
        phone=phone,
        apartment_id=apartment_id or 0,
        apartment_number=apartment_number,
        building_id=building_id,
        building_address=building_address,
    )

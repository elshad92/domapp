"""
DomApp — Resident API (личный кабинет жильца)
GET  /api/v1/resident/me              — профиль + баланс
GET  /api/v1/resident/me/payments     — история платежей
GET  /api/v1/resident/me/requests     — заявки жильца
POST /api/v1/resident/me/requests     — создать заявку
GET  /api/v1/resident/me/announcements — объявления дома
POST /api/v1/resident/me/meters       — передать показания
GET  /api/v1/resident/me/meters       — история показаний
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Header
from backend.db import get_supabase
from backend.models.schemas import (
    MeterReadingCreate, MeterReadingResponse,
    RequestCreate, RequestResponse,
    ResidentProfileResponse,
)
from backend.routers.resident_auth import decode_resident_token

logger = logging.getLogger(__name__)
router = APIRouter(tags=["resident_api"])


def get_current_resident(authorization: str = Header(default="")) -> dict:
    """Получить текущего жильца из JWT."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    token = authorization.split(" ", 1)[1]
    return decode_resident_token(token)


@router.get("/resident/me", response_model=ResidentProfileResponse)
async def resident_profile(
    resident: dict = Depends(get_current_resident),
):
    """Профиль жильца с балансом."""
    db = get_supabase()
    resident_id = resident["resident_id"]

    # Получаем данные жильца
    result = db.table("residents").select("*").eq("id", resident_id).maybe_single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Resident not found")

    data = result.data
    apartment_id = data.get("apartment_id")
    apartment_number = None
    building_id = None
    building_address = None

    if apartment_id:
        apt = db.table("apartments").select("*").eq("id", apartment_id).maybe_single().execute()
        if apt.data:
            apartment_number = apt.data.get("number", "")
            building_id = apt.data.get("building_id")
            if building_id:
                bld = db.table("buildings").select("address").eq("id", building_id).maybe_single().execute()
                if bld.data:
                    building_address = bld.data.get("address", "")

    # Считаем баланс (сумма неплатежей)
    balance = 0.0
    payments = db.table("payments").select("amount,status").eq("resident_id", resident_id).execute()
    if payments.data:
        for p in payments.data:
            if p.get("status") == "pending":
                balance += float(p.get("amount", 0))

    return ResidentProfileResponse(
        id=data["id"],
        name=data.get("name", ""),
        phone=data.get("phone", ""),
        apartment_id=apartment_id or 0,
        apartment_number=apartment_number,
        building_id=building_id,
        building_address=building_address,
        balance=round(balance, 2),
        registered_at=data.get("registered_at", datetime.now(timezone.utc)),
    )


@router.get("/resident/me/payments")
async def resident_payments(
    resident: dict = Depends(get_current_resident),
):
    """История платежей жильца."""
    db = get_supabase()
    resident_id = resident["resident_id"]

    result = (
        db.table("payments")
        .select("*")
        .eq("resident_id", resident_id)
        .order("created_at", desc=True)
        .execute()
    )

    payments = []
    for p in (result.data or []):
        payments.append({
            "id": p["id"],
            "amount": float(p["amount"]),
            "period": p["period"],
            "status": p["status"],
            "paid_at": p.get("paid_at"),
            "created_at": p.get("created_at"),
        })

    return payments


@router.get("/resident/me/requests", response_model=list[RequestResponse])
async def resident_requests(
    resident: dict = Depends(get_current_resident),
):
    """Заявки жильца."""
    db = get_supabase()
    resident_id = resident["resident_id"]

    result = (
        db.table("requests")
        .select("*")
        .eq("resident_id", resident_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


@router.post("/resident/me/requests", response_model=RequestResponse)
async def create_resident_request(
    data: RequestCreate,
    resident: dict = Depends(get_current_resident),
):
    """Создать заявку от имени жильца."""
    db = get_supabase()
    resident_id = resident["resident_id"]

    # Убеждаемся, что resident_id в данных совпадает с токеном
    if data.resident_id != resident_id:
        raise HTTPException(status_code=403, detail="Resident ID mismatch")

    result = db.table("requests").insert(data.model_dump()).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create request")

    logger.info("Resident request created: id=%s resident_id=%s", result.data[0]["id"], resident_id)
    return result.data[0]


@router.get("/resident/me/announcements")
async def resident_announcements(
    resident: dict = Depends(get_current_resident),
):
    """Объявления для дома жильца."""
    db = get_supabase()
    resident_id = resident["resident_id"]

    # Получаем building_id жильца
    res = db.table("residents").select("apartment_id").eq("id", resident_id).maybe_single().execute()
    if not res.data:
        return []

    apartment_id = res.data.get("apartment_id")
    if not apartment_id:
        return []

    apt = db.table("apartments").select("building_id").eq("id", apartment_id).maybe_single().execute()
    if not apt.data:
        return []

    building_id = apt.data["building_id"]

    # Объявления для этого дома или для всех домов (building_id IS NULL)
    result = (
        db.table("announcements")
        .select("*")
        .eq("company_id", 0)  # будет заменено на реальный company_id
        .execute()
    )

    # Фильтруем на стороне кода, т.к. OR (building_id = X OR building_id IS NULL) сложен в PostgREST
    announcements = []
    for a in (result.data or []):
        if a.get("building_id") is None or a.get("building_id") == building_id:
            announcements.append(a)

    return sorted(announcements, key=lambda x: x.get("created_at", ""), reverse=True)


@router.post("/resident/me/meters", response_model=MeterReadingResponse)
async def create_meter_reading(
    data: MeterReadingCreate,
    resident: dict = Depends(get_current_resident),
):
    """Передать показания счётчика."""
    db = get_supabase()
    resident_id = resident["resident_id"]

    if data.resident_id != resident_id:
        raise HTTPException(status_code=403, detail="Resident ID mismatch")

    result = db.table("meter_readings").insert(data.model_dump()).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to save meter reading")

    logger.info("Meter reading saved: resident_id=%s type=%s", resident_id, data.meter_type)
    return result.data[0]


@router.get("/resident/me/meters", response_model=list[MeterReadingResponse])
async def resident_meter_readings(
    resident: dict = Depends(get_current_resident),
):
    """История показаний счётчиков."""
    db = get_supabase()
    resident_id = resident["resident_id"]

    result = (
        db.table("meter_readings")
        .select("*")
        .eq("resident_id", resident_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []

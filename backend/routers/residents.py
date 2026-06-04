"""
DomApp — Residents router
POST /api/v1/residents        — регистрация жильца (бот, internal key)
GET  /api/v1/residents/telegram/{telegram_id} — найти жильца по Telegram ID
GET  /api/v1/apartments/find  — найти квартиру по номеру
"""

import logging
from fastapi import APIRouter, Depends, HTTPException
from backend.auth import verify_internal_key
from backend.db import get_supabase
from backend.models.schemas import ResidentCreate, ResidentResponse, ApartmentResponse

logger = logging.getLogger(__name__)
router = APIRouter(tags=["residents"])


@router.post("/residents", response_model=ResidentResponse)
async def create_resident(
    data: ResidentCreate,
    _: bool = Depends(verify_internal_key),
):
    """Регистрация жильца — только для бота (internal key)."""
    db = get_supabase()

    # Проверить не зарегистрирован ли уже
    existing = db.table("residents").select("*").eq("telegram_id", data.telegram_id).execute()
    existing_data = existing["data"] if isinstance(existing, dict) else existing.data
    if existing_data and len(existing_data) > 0:
        logger.info("Resident already exists: telegram_id=%s", data.telegram_id)
        return existing_data[0]

    result = db.table("residents").insert(data.model_dump()).execute()
    result_data = result["data"] if isinstance(result, dict) else result.data
    if not result_data:
        raise HTTPException(status_code=400, detail="Failed to create resident")
    logger.info("Resident registered: telegram_id=%s", data.telegram_id)
    return result_data[0]


@router.get("/residents/telegram/{telegram_id}")
async def get_resident_by_telegram(
    telegram_id: int,
    _: bool = Depends(verify_internal_key),
):
    """Найти жильца по Telegram ID (с информацией о квартире и доме)."""
    db = get_supabase()
    result = db.table("residents").select("*").eq("telegram_id", telegram_id).execute()
    result_data = result["data"] if isinstance(result, dict) else result.data
    if not result_data or len(result_data) == 0:
        raise HTTPException(status_code=404, detail="Resident not found")

    resident = result_data[0]

    # Добавляем информацию о квартире и доме
    apartment_id = resident.get("apartment_id")
    if apartment_id:
        apt = db.table("apartments").select("*").eq("id", apartment_id).maybe_single().execute()
        apt_data = apt["data"] if isinstance(apt, dict) else apt.data
        if apt_data:
            resident["apartment_number"] = apt_data.get("number", "")
            resident["building_id"] = apt_data.get("building_id")
            # Получаем название дома
            building_id = apt_data.get("building_id")
            if building_id:
                bld = db.table("buildings").select("name,address").eq("id", building_id).maybe_single().execute()
                bld_data = bld["data"] if isinstance(bld, dict) else bld.data
                if bld_data:
                    resident["building_name"] = bld_data.get("name") or bld_data.get("address", "")

    return resident


@router.get("/apartments/find", response_model=list[ApartmentResponse])
async def find_apartment(
    number: str,
    building_id: int | None = None,
    _: bool = Depends(verify_internal_key),
):
    """Найти квартиру по номеру — для бота при регистрации жильца."""
    db = get_supabase()
    query = db.table("apartments").select("*").eq("number", number)
    if building_id:
        query = query.eq("building_id", building_id)
    resp = query.execute()
    if isinstance(resp, dict):
        return resp.get("data", [])
    return getattr(resp, "data", [])

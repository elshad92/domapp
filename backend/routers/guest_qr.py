"""
DomApp — Guest QR Code Router
POST   /api/v1/resident/me/guest-qr       — создать QR-код для гостя
GET    /api/v1/guest/verify/{code_id}      — проверить QR-код (для охраны)
POST   /api/v1/guest/deactivate/{code_id}  — деактивировать QR-код
"""

import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

from backend.auth import require_feature
from backend.db import get_supabase
from backend.routers.resident_api import get_current_resident
from backend.services.qr_code import (
    generate_guest_qr,
    verify_guest_code,
    deactivate_guest_code,
    GUEST_CODE_EXPIRE_HOURS,
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["guest_qr"])


class GuestQrResponse(BaseModel):
    code_id: str
    expires_at: str
    qr_base64: str  # PNG в base64 для отображения на фронтенде


@router.post("/resident/me/guest-qr")
async def create_guest_qr(
    resident: dict = Depends(get_current_resident),
    _: dict = Depends(require_feature("guest_qr")),
):
    """
    Создать QR-код для гостя.
    Жилец может сгенерировать код для пропуска гостя в дом.
    """
    db = get_supabase()
    resident_id = resident["resident_id"]

    # Получаем данные жильца
    res = db.table("residents").select("name, apartment_id").eq("id", resident_id).maybe_single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Жилец не найден")

    resident_name = res.data.get("name", "")
    apartment_id = res.data.get("apartment_id")
    if not apartment_id:
        raise HTTPException(status_code=400, detail="У жильца нет квартиры")

    # Получаем квартиру и дом
    apt = db.table("apartments").select("number, building_id").eq("id", apartment_id).maybe_single().execute()
    if not apt.data:
        raise HTTPException(status_code=404, detail="Квартира не найдена")

    building_id = apt.data["building_id"]
    apartment_number = apt.data["number"]

    bld = db.table("buildings").select("address").eq("id", building_id).maybe_single().execute()
    building_address = bld.data.get("address", "") if bld.data else ""

    # Генерируем QR-код
    code_id, png_bytes = generate_guest_qr(
        building_id=building_id,
        building_address=building_address,
        apartment_number=apartment_number,
        resident_name=resident_name,
    )

    import base64
    qr_base64 = base64.b64encode(png_bytes).decode("utf-8")

    logger.info("Guest QR created: resident_id=%s code_id=%s", resident_id, code_id)

    return {
        "code_id": code_id,
        "expires_at": (await _get_expires_at(code_id)),
        "qr_base64": qr_base64,
        "building_address": building_address,
        "apartment_number": apartment_number,
    }


async def _get_expires_at(code_id: str) -> str:
    """Получить expires_at для кода."""
    from backend.services.qr_code import _guest_codes
    code = _guest_codes.get(code_id)
    return code.get("expires_at", "") if code else ""


@router.get("/guest/verify/{code_id}")
async def verify_guest(code_id: str):
    """
    Проверить гостевой QR-код (для охраны/домофона).
    """
    result = verify_guest_code(code_id)
    return result


@router.post("/guest/deactivate/{code_id}")
async def deactivate_guest(code_id: str):
    """
    Деактивировать гостевой QR-код.
    """
    success = deactivate_guest_code(code_id)
    if not success:
        raise HTTPException(status_code=404, detail="Код не найден")
    return {"success": True, "message": "Код деактивирован"}

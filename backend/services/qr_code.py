"""
DomApp — QR Code Service
Генерация QR-кодов для гостевого доступа
"""

import io
import json
import logging
import uuid
from datetime import datetime, timedelta, timezone

import qrcode

logger = logging.getLogger(__name__)

# Хранилище гостевых QR-кодов (в памяти; для production — Redis/DB)
_guest_codes: dict[str, dict] = {}
GUEST_CODE_EXPIRE_HOURS = 24


def generate_guest_qr(
    building_id: int,
    building_address: str,
    apartment_number: str,
    resident_name: str,
    resident_id: int | None = None,
    valid_hours: int = GUEST_CODE_EXPIRE_HOURS,
) -> tuple[str, bytes]:
    """
    Сгенерировать QR-код для гостя.

    Returns:
        (code_id, png_bytes) — уникальный ID кода и PNG-изображение QR-кода.
    """
    code_id = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(hours=valid_hours)

    # Данные, закодированные в QR-коде
    qr_data = json.dumps({
        "type": "guest_access",
        "code_id": code_id,
        "building_id": building_id,
        "expires_at": expires_at.isoformat(),
    }, ensure_ascii=False)

    # Генерируем QR-код
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_data)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")

    # Сохраняем в PNG
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    png_bytes = buf.getvalue()

    # Сохраняем метаданные
    _guest_codes[code_id] = {
        "code_id": code_id,
        "building_id": building_id,
        "resident_id": resident_id,
        "building_address": building_address,
        "apartment_number": apartment_number,
        "resident_name": resident_name,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": expires_at.isoformat(),
        "is_active": True,
    }

    logger.info(
        "Guest QR generated: code_id=%s building=%s apt=%s expires=%s",
        code_id, building_id, apartment_number, expires_at.isoformat(),
    )

    return code_id, png_bytes


def verify_guest_code(code_id: str) -> dict:
    """
    Проверить гостевой QR-код.

    Returns:
        dict с информацией о коде или {"valid": False, "reason": "..."}.
    """
    code = _guest_codes.get(code_id)
    if not code:
        return {"valid": False, "reason": "Код не найден"}

    if not code.get("is_active", False):
        return {"valid": False, "reason": "Код деактивирован"}

    expires_at = code.get("expires_at")
    if expires_at:
        try:
            expires = datetime.fromisoformat(expires_at)
            if expires < datetime.now(timezone.utc):
                return {"valid": False, "reason": "Срок действия кода истёк"}
        except (ValueError, TypeError):
            pass

    return {
        "valid": True,
        "building_id": code["building_id"],
        "building_address": code.get("building_address", ""),
        "apartment_number": code.get("apartment_number", ""),
        "resident_name": code.get("resident_name", ""),
    }


def deactivate_guest_code(code_id: str, resident_id: int | None = None) -> bool:
    """Деактивировать гостевой код."""
    code = _guest_codes.get(code_id)
    if not code:
        return False
    if resident_id is not None and code.get("resident_id") != resident_id:
        return False
    code["is_active"] = False
    logger.info("Guest code deactivated: %s", code_id)
    return True

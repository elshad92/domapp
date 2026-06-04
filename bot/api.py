"""
DomApp Bot — API клиент для backend
"""

import os
import logging
import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "")


async def _post(path: str, data: dict) -> dict | None:
    """POST запрос к backend с Internal API Key."""
    url = f"{BACKEND_URL}/api/v1{path}"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                url,
                json=data,
                headers={"X-Internal-Key": INTERNAL_API_KEY},
            )
            if resp.status_code in (200, 201):
                return resp.json()
            logger.warning("API POST %s: %s %s", url, resp.status_code, resp.text)
            return None
    except Exception as e:
        logger.error("API POST %s error: %s", url, e)
        return None


async def _get(path: str, params: dict | None = None) -> list | dict | None:
    """GET запрос к backend с Internal API Key."""
    url = f"{BACKEND_URL}/api/v1{path}"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                url,
                params=params,
                headers={"X-Internal-Key": INTERNAL_API_KEY},
            )
            if resp.status_code == 200:
                return resp.json()
            logger.warning("API GET %s: %s %s", url, resp.status_code, resp.text)
            return None
    except Exception as e:
        logger.error("API GET %s error: %s", url, e)
        return None


async def create_resident(telegram_id: int, name: str, phone: str, apartment_id: int) -> dict | None:
    """Зарегистрировать жильца."""
    return await _post("/residents", {
        "telegram_id": telegram_id,
        "name": name,
        "phone": phone,
        "apartment_id": apartment_id,
    })


async def get_resident_by_telegram(telegram_id: int) -> dict | None:
    """Получить жильца по Telegram ID."""
    result = await _get(f"/residents/telegram/{telegram_id}")
    if isinstance(result, dict):
        return result
    return None


async def create_request(resident_id: int, building_id: int, category: str, description: str, photo_url: str | None = None) -> dict | None:
    """Создать заявку."""
    return await _post("/requests", {
        "resident_id": resident_id,
        "building_id": building_id,
        "category": category,
        "description": description,
        "photo_url": photo_url,
    })


async def get_requests(resident_id: int) -> list:
    """Получить заявки жильца."""
    result = await _get("/bot/requests", {"resident_id": resident_id})
    if isinstance(result, list):
        return result
    return []


async def get_announcements(building_id: int | None = None) -> list:
    """Получить объявления."""
    params = {}
    if building_id:
        params["building_id"] = building_id
    result = await _get("/announcements", params)
    if isinstance(result, list):
        return result
    return []


async def find_apartment(number: str, building_id: int | None = None) -> list:
    """Поиск квартиры по номеру."""
    params = {"number": number}
    if building_id:
        params["building_id"] = building_id
    result = await _get("/apartments/find", params)
    if isinstance(result, list):
        return result
    return []

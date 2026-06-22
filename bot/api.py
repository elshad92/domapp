"""
DomApp Bot — API клиент для backend
С retry логикой и таймаутами
"""

import os
import asyncio
import logging
import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "")

MAX_RETRIES = 3
RETRY_DELAY = 1.0  # секунд


async def _post(path: str, data: dict) -> dict | None:
    """POST запрос к backend с Internal API Key и retry."""
    url = f"{BACKEND_URL}/api/v1{path}"
    last_error = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(
                    url,
                    json=data,
                    headers={"X-Internal-Key": INTERNAL_API_KEY},
                )
                if resp.status_code in (200, 201):
                    return resp.json()
                logger.warning(
                    "API POST %s (attempt %d/%d): %s %s",
                    url, attempt, MAX_RETRIES, resp.status_code, resp.text[:200],
                )
                if resp.status_code < 500:
                    return None  # 4xx — не retry
        except httpx.TimeoutException as e:
            last_error = e
            logger.warning("API POST %s timeout (attempt %d/%d)", url, attempt, MAX_RETRIES)
        except httpx.RequestError as e:
            last_error = e
            logger.warning("API POST %s error (attempt %d/%d): %s", url, attempt, MAX_RETRIES, e)

        if attempt < MAX_RETRIES:
            await asyncio.sleep(RETRY_DELAY * attempt)

    logger.error("API POST %s failed after %d attempts: %s", url, MAX_RETRIES, last_error)
    return None


async def _get(path: str, params: dict | None = None) -> list | dict | None:
    """GET запрос к backend с Internal API Key и retry."""
    url = f"{BACKEND_URL}/api/v1{path}"
    last_error = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(
                    url,
                    params=params,
                    headers={"X-Internal-Key": INTERNAL_API_KEY},
                )
                if resp.status_code == 200:
                    return resp.json()
                logger.warning(
                    "API GET %s (attempt %d/%d): %s %s",
                    url, attempt, MAX_RETRIES, resp.status_code, resp.text[:200],
                )
                if resp.status_code < 500:
                    return None
        except httpx.TimeoutException as e:
            last_error = e
            logger.warning("API GET %s timeout (attempt %d/%d)", url, attempt, MAX_RETRIES)
        except httpx.RequestError as e:
            last_error = e
            logger.warning("API GET %s error (attempt %d/%d): %s", url, attempt, MAX_RETRIES, e)

        if attempt < MAX_RETRIES:
            await asyncio.sleep(RETRY_DELAY * attempt)

    logger.error("API GET %s failed after %d attempts: %s", url, MAX_RETRIES, last_error)
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
    result = await _get("/bot/announcements", params)
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

"""
Telegram notifications sent by the backend through the Bot HTTP API.
"""

from __future__ import annotations

import logging
import os

import httpx

logger = logging.getLogger(__name__)

TELEGRAM_API_BASE = "https://api.telegram.org"


async def _send_message(chat_id: int, text: str, parse_mode: str = "HTML") -> bool:
    token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    if not token:
        logger.warning("TELEGRAM_BOT_TOKEN is not configured; notification skipped")
        return False

    url = f"{TELEGRAM_API_BASE}/bot{token}/sendMessage"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                url,
                json={"chat_id": chat_id, "text": text, "parse_mode": parse_mode},
            )
            response.raise_for_status()
        return True
    except httpx.HTTPError as exc:
        logger.warning("Telegram notification failed for chat_id=%s: %s", chat_id, exc.__class__.__name__)
        return False


async def notify_request_status(
    telegram_id: int,
    request_id: int,
    category: str,
    old_status: str,
    new_status: str,
    comment: str | None = None,
) -> None:
    status_emoji = {
        "new": "[new]",
        "in_progress": "[work]",
        "done": "[done]",
        "cancelled": "[cancelled]",
    }
    status_names = {
        "new": "Новая",
        "in_progress": "В работе",
        "done": "Выполнена",
        "cancelled": "Отменена",
    }

    text = (
        f"{status_emoji.get(new_status, '[status]')} <b>Статус заявки изменён</b>\n\n"
        f"Заявка #{request_id}\n"
        f"Категория: {category}\n"
        f"Статус: <b>{status_names.get(new_status, new_status)}</b>\n"
    )
    if comment:
        text += f"Комментарий: {comment}\n"
    text += "\nОтслеживать заявки можно в меню «Мои заявки»."

    if await _send_message(telegram_id, text):
        logger.info(
            "Request status notification sent telegram_id=%s request_id=%s old=%s new=%s",
            telegram_id,
            request_id,
            old_status,
            new_status,
        )


async def notify_new_announcement(
    building_id: int,
    title: str,
    content: str,
    resident_telegram_ids: list[int],
) -> None:
    text = f"<b>{title}</b>\n\n{content[:200]}"
    sent = 0
    for telegram_id in resident_telegram_ids:
        if await _send_message(telegram_id, text):
            sent += 1
    logger.info("Announcement notification sent %s/%s for building_id=%s", sent, len(resident_telegram_ids), building_id)

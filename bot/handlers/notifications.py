"""
DomApp Bot — Уведомления
Отправка уведомлений жильцам об изменении статуса заявок
"""

import os
import logging
from telegram import Bot

logger = logging.getLogger(__name__)

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")

_bot: Bot | None = None


def get_bot() -> Bot:
    global _bot
    if _bot is None:
        _bot = Bot(token=TOKEN)
    return _bot


async def notify_request_status(
    telegram_id: int,
    request_id: int,
    category: str,
    old_status: str,
    new_status: str,
    comment: str | None = None,
):
    """
    Отправить уведомление жильцу об изменении статуса заявки.
    """
    status_emoji = {
        "new": "🆕",
        "in_progress": "🔄",
        "done": "✅",
        "cancelled": "❌",
    }
    status_names = {
        "new": "Новая",
        "in_progress": "В работе",
        "done": "Выполнена",
        "cancelled": "Отменена",
    }
    
    emoji = status_emoji.get(new_status, "📋")
    name = status_names.get(new_status, new_status)
    
    text = (
        f"{emoji} <b>Статус заявки изменён</b>\n\n"
        f"📋 Заявка #{request_id}\n"
        f"📂 {category}\n"
        f"📊 Статус: <b>{name}</b>\n"
    )
    
    if comment:
        text += f"💬 Комментарий: {comment}\n"
    
    text += f"\nОтслеживать заявки можно в меню «Мои заявки»."
    
    try:
        bot = get_bot()
        await bot.send_message(
            chat_id=telegram_id,
            text=text,
            parse_mode="HTML",
        )
        logger.info("Уведомление отправлено telegram_id=%s, request_id=%s", telegram_id, request_id)
    except Exception as e:
        logger.error("Ошибка отправки уведомления telegram_id=%s: %s", telegram_id, e)


async def notify_new_announcement(
    building_id: int,
    title: str,
    content: str,
    resident_telegram_ids: list[int],
):
    """
    Отправить уведомление о новом объявлении всем жильцам дома.
    """
    text = (
        f"📢 <b>Новое объявление</b>\n\n"
        f"<b>{title}</b>\n"
        f"{content[:200]}"
    )
    
    bot = get_bot()
    sent = 0
    for tg_id in resident_telegram_ids:
        try:
            await bot.send_message(chat_id=tg_id, text=text, parse_mode="HTML")
            sent += 1
        except Exception as e:
            logger.warning("Не удалось отправить объявление tg_id=%s: %s", tg_id, e)
    
    logger.info("Объявление отправлено %s/%s жильцам дома %s", sent, len(resident_telegram_ids), building_id)

"""
DomApp — Announcements handler (просмотр объявлений)
"""

import logging
from telegram import Update
from bot.keyboards import MAIN_MENU_RU
from bot.api import get_announcements, get_resident_by_telegram

logger = logging.getLogger(__name__)


async def list_announcements(update: Update, context):
    user_id = update.effective_user.id

    # Получаем жильца (чтобы узнать building_id)
    resident = await get_resident_by_telegram(user_id)
    building_id = resident.get("apartment_id") if resident else None

    # Получаем объявления
    announcements = await get_announcements(building_id)

    if not announcements:
        await update.message.reply_text(
            "📢 Объявления:\n\n"
            "Пока нет новых объявлений.",
            reply_markup=MAIN_MENU_RU,
        )
        return

    lines = ["📢 Объявления:\n"]
    for a in announcements:
        created = a.get("created_at", "")[:10] if a.get("created_at") else ""
        text = a.get("text", "")[:200]
        lines.append(f"📅 {created}")
        lines.append(text)
        lines.append("")

    await update.message.reply_text(
        "\n".join(lines).strip(),
        reply_markup=MAIN_MENU_RU,
    )

"""
DomApp Bot — Status handler (просмотр статуса заявок)
"""

import logging
from telegram import Update
from telegram.ext import ContextTypes
from bot.api import get_resident_by_telegram, get_requests
from bot.keyboards import MAIN_MENU_RU

logger = logging.getLogger(__name__)

STATUS_EMOJI = {
    "new": "🆕",
    "in_progress": "�",
    "done": "✅",
}

STATUS_TEXT = {
    "new": "Новая",
    "in_progress": "В работе",
    "done": "Выполнена",
}


async def list_requests(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Показать список заявок жильца."""
    telegram_id = update.effective_user.id

    resident = await get_resident_by_telegram(telegram_id)
    if not resident:
        await update.message.reply_text(
            "❌ Вы не зарегистрированы. Используйте /start для регистрации.",
            reply_markup=MAIN_MENU_RU,
        )
        return

    resident_id = resident.get("id")
    requests = await get_requests(resident_id)

    if not requests:
        await update.message.reply_text(
            "📋 У вас пока нет заявок.\n\n"
            "Чтобы создать заявку, нажмите «Подать заявку» в меню.",
            reply_markup=MAIN_MENU_RU,
        )
        return

    lines = ["📋 <b>Ваши заявки:</b>\n"]
    for req in requests[-10:]:  # последние 10
        status = req.get("status", "new")
        emoji = STATUS_EMOJI.get(status, "❓")
        status_text = STATUS_TEXT.get(status, status)
        category = req.get("category", "—")
        description = req.get("description", "")[:60]
        created = req.get("created_at", "")[:10]

        lines.append(
            f"{emoji} <b>#{req['id']}</b> | {category}\n"
            f"   {description}\n"
            f"   Статус: {status_text} | {created}\n"
        )

    lines.append("\nЧтобы создать новую заявку, нажмите «Подать заявку».")

    await update.message.reply_text(
        "\n".join(lines),
        parse_mode="HTML",
        reply_markup=MAIN_MENU_RU,
    )

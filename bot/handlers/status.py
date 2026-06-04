"""
DomApp — Status handler (просмотр заявок жильца)
"""

import logging
from telegram import Update
from bot.keyboards import MAIN_MENU_RU
from bot.api import get_requests, get_resident_by_telegram

logger = logging.getLogger(__name__)

STATUS_LABELS = {
    "new": "🟡 Новая",
    "in_progress": "🔵 В работе",
    "done": "🟢 Выполнено",
}


async def list_requests(update: Update, context):
    user_id = update.effective_user.id

    # Получаем жильца
    resident = await get_resident_by_telegram(user_id)
    if not resident:
        await update.message.reply_text(
            "❌ Вы не зарегистрированы. Нажмите /start для регистрации.",
            reply_markup=MAIN_MENU_RU,
        )
        return

    # Получаем заявки
    requests = await get_requests(resident["id"])

    if not requests:
        await update.message.reply_text(
            "📋 Ваши заявки:\n\n"
            "Пока нет заявок. Нажмите «Подать заявку», чтобы создать новую.",
            reply_markup=MAIN_MENU_RU,
        )
        return

    lines = ["📋 Ваши заявки:\n"]
    for r in requests:
        status = STATUS_LABELS.get(r.get("status", ""), r.get("status", ""))
        created = r.get("created_at", "")[:10] if r.get("created_at") else ""
        desc = r.get("description", "")[:50]
        lines.append(f"#{r['id']} {status} — {desc}")
        if created:
            lines[-1] += f" ({created})"

    await update.message.reply_text(
        "\n".join(lines),
        reply_markup=MAIN_MENU_RU,
    )

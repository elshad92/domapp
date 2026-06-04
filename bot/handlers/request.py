"""
DomApp — Request handler (подача заявки)
Флоу: категория → описание → фото (опц.) → подтверждение → POST на backend
"""

import logging
from telegram import Update, ReplyKeyboardRemove
from telegram.ext import ConversationHandler
from bot.keyboards import CATEGORIES_RU, CONFIRM_RU, MAIN_MENU_RU
from bot.api import create_request, get_resident_by_telegram

logger = logging.getLogger(__name__)

CATEGORY, DESCRIPTION, PHOTO, CONFIRM = range(4)

_temp_data = {}


async def start(update: Update, context):
    user_id = update.effective_user.id
    _temp_data[user_id] = {}
    await update.message.reply_text(
        "Выберите категорию заявки:",
        reply_markup=CATEGORIES_RU,
    )
    return CATEGORY


async def category_selected(update: Update, context):
    user_id = update.effective_user.id
    text = update.message.text

    if text == "🔙 Назад":
        await update.message.reply_text("Главное меню:", reply_markup=MAIN_MENU_RU)
        return ConversationHandler.END

    _temp_data[user_id]["category"] = text.replace("🔧 ", "").replace("⚡ ", "").replace("🔨 ", "").replace("🧹 ", "")

    await update.message.reply_text(
        "Опишите проблему подробно:",
        reply_markup=ReplyKeyboardRemove(),
    )
    return DESCRIPTION


async def description_received(update: Update, context):
    user_id = update.effective_user.id
    _temp_data[user_id]["description"] = update.message.text

    await update.message.reply_text(
        "Хотите добавить фото? (отправьте фото или нажмите «Пропустить»)",
        reply_markup=CONFIRM_RU,
    )
    return PHOTO


async def photo_received(update: Update, context):
    user_id = update.effective_user.id
    photo = update.message.photo
    if photo:
        _temp_data[user_id]["photo"] = photo[-1].file_id

    data = _temp_data[user_id]
    await update.message.reply_text(
        f"📋 Проверьте заявку:\n"
        f"📂 Категория: {data.get('category')}\n"
        f"📝 Описание: {data.get('description')}\n"
        f"📸 Фото: {'✅' if data.get('photo') else '❌'}\n\n"
        "Отправить?",
        reply_markup=CONFIRM_RU,
    )
    return CONFIRM


async def confirm(update: Update, context):
    user_id = update.effective_user.id
    text = update.message.text

    if "Отмена" in text or "Bekor" in text:
        _temp_data.pop(user_id, None)
        await update.message.reply_text("Заявка отменена.", reply_markup=MAIN_MENU_RU)
        return ConversationHandler.END

    data = _temp_data.pop(user_id, {})

    # Получаем жильца по Telegram ID
    resident = await get_resident_by_telegram(user_id)
    if not resident:
        await update.message.reply_text(
            "❌ Вы не зарегистрированы. Нажмите /start для регистрации.",
            reply_markup=MAIN_MENU_RU,
        )
        return ConversationHandler.END

    # Создаём заявку
    result = await create_request(
        resident_id=resident["id"],
        building_id=resident.get("apartment_id", 1),  # временно
        category=data.get("category", "Другое"),
        description=data.get("description", ""),
        photo_url=data.get("photo"),
    )

    if result:
        logger.info("Request created: user=%s, id=%s", user_id, result.get("id"))
        await update.message.reply_text(
            "✅ Заявка отправлена! Мы свяжемся с вами.",
            reply_markup=MAIN_MENU_RU,
        )
    else:
        logger.warning("Request creation failed: user=%s", user_id)
        await update.message.reply_text(
            "❌ Ошибка при отправке заявки. Попробуйте позже.",
            reply_markup=MAIN_MENU_RU,
        )

    return ConversationHandler.END

"""
DomApp — Start handler (регистрация жильца)
Флоу: /start → запрос номера → поиск квартиры → подтверждение → сохранение
"""

import logging
from telegram import Update, ReplyKeyboardRemove
from telegram.ext import (
    CommandHandler,
    MessageHandler,
    filters,
    ConversationHandler,
)
from bot.keyboards import PHONE_REQUEST, MAIN_MENU_RU
from bot.api import create_resident, find_apartment

logger = logging.getLogger(__name__)

# Состояния
PHONE, APARTMENT, CONFIRM = range(3)

# Хранилище временных данных (в проде — Redis/БД)
_temp_data = {}


async def start_command(update: Update, context):
    user = update.effective_user
    await update.message.reply_text(
        f"👋 Здравствуйте, {user.first_name}!\n\n"
        "Добро пожаловать в DomApp — систему управления вашим домом.\n\n"
        "Для регистрации отправьте ваш номер телефона.",
        reply_markup=PHONE_REQUEST,
    )
    return PHONE


async def phone_received(update: Update, context):
    contact = update.message.contact
    if not contact:
        await update.message.reply_text("Пожалуйста, нажмите кнопку «Отправить номер телефона»")
        return PHONE

    phone = contact.phone_number
    user_id = update.effective_user.id
    _temp_data[user_id] = {"phone": phone, "name": update.effective_user.full_name}

    await update.message.reply_text(
        f"✅ Номер получен: {phone}\n\n"
        "Теперь введите номер вашей квартиры (например: 42):",
        reply_markup=ReplyKeyboardRemove(),
    )
    return APARTMENT


async def apartment_received(update: Update, context):
    user_id = update.effective_user.id
    apartment_number = update.message.text.strip()

    if not apartment_number.isdigit():
        await update.message.reply_text("Пожалуйста, введите номер квартиры цифрами (например: 42)")
        return APARTMENT

    _temp_data[user_id]["apartment"] = apartment_number

    await update.message.reply_text(
        f"📋 Проверьте данные:\n"
        f"🏠 Квартира: {apartment_number}\n"
        f"📞 Телефон: {_temp_data[user_id]['phone']}\n\n"
        "Всё верно? Напишите «да» для подтверждения.",
    )
    return CONFIRM


async def confirm(update: Update, context):
    user_id = update.effective_user.id
    text = update.message.text.lower()

    if text not in ("да", "yes", "ha"):
        await update.message.reply_text("Регистрация отменена.", reply_markup=MAIN_MENU_RU)
        _temp_data.pop(user_id, None)
        return ConversationHandler.END

    data = _temp_data.pop(user_id, {})

    # Ищем квартиру по номеру
    apartments = await find_apartment(data.get("apartment", ""))
    if not apartments:
        await update.message.reply_text(
            "❌ Квартира не найдена. Проверьте номер или свяжитесь с УК.",
            reply_markup=MAIN_MENU_RU,
        )
        return ConversationHandler.END

    apartment = apartments[0]
    apartment_id = apartment["id"]

    # Регистрируем жильца
    result = await create_resident(
        telegram_id=user_id,
        name=data.get("name", "Жилец"),
        phone=data.get("phone", ""),
        apartment_id=apartment_id,
    )

    if result:
        logger.info("Resident registered: user=%s, id=%s", user_id, result.get("id"))
        await update.message.reply_text(
            "✅ Вы успешно зарегистрированы!\n\n"
            "Теперь вы можете подавать заявки и получать объявления.",
            reply_markup=MAIN_MENU_RU,
        )
    else:
        logger.warning("Resident registration failed: user=%s", user_id)
        await update.message.reply_text(
            "❌ Ошибка регистрации. Попробуйте позже или свяжитесь с УК.",
            reply_markup=MAIN_MENU_RU,
        )

    return ConversationHandler.END


async def cancel(update: Update, context):
    user_id = update.effective_user.id
    _temp_data.pop(user_id, None)
    await update.message.reply_text("Регистрация отменена.", reply_markup=MAIN_MENU_RU)
    return ConversationHandler.END


# ConversationHandler states
STATES = {
    PHONE: [MessageHandler(filters.CONTACT, phone_received)],
    APARTMENT: [MessageHandler(filters.TEXT & ~filters.COMMAND, apartment_received)],
    CONFIRM: [MessageHandler(filters.TEXT & ~filters.COMMAND, confirm)],
}

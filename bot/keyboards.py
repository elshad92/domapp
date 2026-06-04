"""
DomApp — Telegram клавиатуры
"""

from telegram import ReplyKeyboardMarkup, KeyboardButton

# Главное меню (русский)
MAIN_MENU_RU = ReplyKeyboardMarkup(
    [
        [KeyboardButton("Подать заявку")],
        [KeyboardButton("Мои заявки")],
        [KeyboardButton("Объявления")],
        [KeyboardButton("🤖 AI помощник")],
    ],
    resize_keyboard=True,
)

# Главное меню (узбекский)
MAIN_MENU_UZ = ReplyKeyboardMarkup(
    [
        [KeyboardButton("Ariza berish")],
        [KeyboardButton("Mening arizalarim")],
        [KeyboardButton("E'lonlar")],
        [KeyboardButton("🤖 AI yordamchi")],
    ],
    resize_keyboard=True,
)

# Запрос номера телефона
PHONE_REQUEST = ReplyKeyboardMarkup(
    [[KeyboardButton("📱 Отправить номер телефона", request_contact=True)]],
    resize_keyboard=True,
)

# Категории заявок (русский)
CATEGORIES_RU = ReplyKeyboardMarkup(
    [
        ["🔧 Сантехника", "⚡ Электрика"],
        ["🔨 Ремонт", "🧹 Уборка"],
        ["🔙 Назад"],
    ],
    resize_keyboard=True,
)

# Категории заявок (узбекский)
CATEGORIES_UZ = ReplyKeyboardMarkup(
    [
        ["🔧 Santexnika", "⚡ Elektr"],
        ["🔨 Ta'mirlash", "🧹 Tozalash"],
        ["🔙 Orqaga"],
    ],
    resize_keyboard=True,
)

# Подтверждение
CONFIRM_RU = ReplyKeyboardMarkup(
    [["✅ Отправить", "❌ Отмена"]],
    resize_keyboard=True,
)

CONFIRM_UZ = ReplyKeyboardMarkup(
    [["✅ Yuborish", "❌ Bekor qilish"]],
    resize_keyboard=True,
)

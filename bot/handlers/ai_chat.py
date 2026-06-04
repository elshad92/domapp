"""
DomApp — AI Chat handler (DeepSeek)
Флоу: кнопка "AI помощник" → свободный диалог → "Назад" в меню
AI может создавать заявки, отвечать на вопросы по дому
"""

import logging
from telegram import Update, ReplyKeyboardMarkup
from telegram.ext import ConversationHandler
from bot.keyboards import MAIN_MENU_RU
from bot.deepseek import ask_deepseek, parse_create_request
from bot.api import get_resident_by_telegram, get_requests, create_request

logger = logging.getLogger(__name__)

CHAT = range(1)

# Хранилище истории диалогов (в проде — Redis/БД)
_chat_history: dict[int, list[dict]] = {}

# Клавиатура во время чата
CHAT_KEYBOARD = ReplyKeyboardMarkup(
    [["🔙 Назад в меню"]],
    resize_keyboard=True,
)


async def _load_user_context(telegram_id: int) -> dict:
    """Загрузить контекст пользователя: данные жильца, заявки, платежи."""
    context = {}
    
    resident = await get_resident_by_telegram(telegram_id)
    if resident:
        context["resident"] = {
            "name": resident.get("name", ""),
            "apartment_number": resident.get("apartment_number", ""),
            "building_name": resident.get("building_name", ""),
            "id": resident.get("id"),
            "building_id": resident.get("building_id"),
        }
        
        # Загружаем заявки жильца
        resident_id = resident.get("id")
        if resident_id:
            requests = await get_requests(resident_id)
            context["requests"] = [
                {
                    "id": r.get("id"),
                    "status": r.get("status", ""),
                    "category": r.get("category", ""),
                    "description": r.get("description", ""),
                    "created_at": r.get("created_at", ""),
                }
                for r in requests[-10:]  # последние 10
            ]
    
    return context


async def start(update: Update, context):
    """Начать диалог с AI."""
    user_id = update.effective_user.id
    _chat_history[user_id] = []
    
    # Загружаем контекст пользователя в фоне
    user_context = await _load_user_context(user_id)
    context.user_data["ai_context"] = user_context
    
    name = user_context.get("resident", {}).get("name", "")
    greeting = f", {name}" if name else ""
    
    await update.message.reply_text(
        f"🤖 <b>AI помощник DomApp</b>{greeting}\n\n"
        "Я помогу вам с домом и ЖКХ. Вот что я умею:\n\n"
        "📋 <b>Создать заявку</b> — просто опишите проблему\n"
        "   Например: «Течёт кран в ванной»\n\n"
        "📌 <b>Проверить статус</b> — спросите про свои заявки\n"
        "   Например: «Какие у меня заявки?»\n\n"
        "💡 <b>Бытовой совет</b> — спросите что делать\n"
        "   Например: «Что делать если прорвало трубу?»\n\n"
        "💰 <b>Оплата</b> — вопросы по квартплате\n\n"
        "Напишите «Назад» чтобы вернуться в меню.",
        parse_mode="HTML",
        reply_markup=CHAT_KEYBOARD,
    )
    return CHAT


async def handle_message(update: Update, context):
    """Обработать сообщение пользователя и ответить через DeepSeek."""
    user_id = update.effective_user.id
    text = update.message.text.strip()

    # Проверка на выход
    if text.lower() in ("🔙 назад в меню", "назад", "меню", "back", "orqaga"):
        _chat_history.pop(user_id, None)
        context.user_data.pop("ai_context", None)
        await update.message.reply_text(
            "Главное меню:",
            reply_markup=MAIN_MENU_RU,
        )
        return ConversationHandler.END

    # Отправляем "печатает..." чтобы пользователь ждал
    await update.message.chat.send_action(action="typing")

    # Получаем историю
    history = _chat_history.get(user_id, [])
    
    # Получаем контекст пользователя
    user_context = context.user_data.get("ai_context", {})

    # Запрашиваем DeepSeek с контекстом
    reply = await ask_deepseek(text, history, user_context)

    # Сохраняем в историю
    history.append({"role": "user", "content": text})
    history.append({"role": "assistant", "content": reply})
    _chat_history[user_id] = history

    # Проверяем, не хочет ли AI создать заявку
    request_data = parse_create_request(reply)
    if request_data:
        # Убираем маркер из ответа пользователю
        clean_reply = reply.split("[СОЗДАТЬ_ЗАЯВКУ]")[0].strip()
        
        # Создаём заявку
        resident = user_context.get("resident", {})
        resident_id = resident.get("id")
        building_id = resident.get("building_id")
        
        if resident_id and building_id:
            result = await create_request(
                resident_id=resident_id,
                building_id=building_id,
                category=request_data["category"],
                description=request_data["description"],
            )
            if result:
                request_id = result.get("id", "—")
                await update.message.reply_text(
                    f"✅ <b>Заявка создана!</b>\n"
                    f"📋 Номер: #{request_id}\n"
                    f"📂 Категория: {request_data['category']}\n"
                    f"📝 {request_data['description']}\n\n"
                    f"Статус: 🔵 Новая\n"
                    f"Вы можете отслеживать статус в меню «Мои заявки».",
                    parse_mode="HTML",
                    reply_markup=CHAT_KEYBOARD,
                )
                return CHAT
            else:
                await update.message.reply_text(
                    "❌ Не удалось создать заявку. Попробуйте через меню «Подать заявку».",
                    reply_markup=CHAT_KEYBOARD,
                )
                return CHAT
    
    # Отправляем ответ AI
    await update.message.reply_text(
        reply,
        reply_markup=CHAT_KEYBOARD,
    )

    return CHAT


async def cancel(update: Update, context):
    """Отмена и выход в меню."""
    user_id = update.effective_user.id
    _chat_history.pop(user_id, None)
    context.user_data.pop("ai_context", None)
    await update.message.reply_text(
        "Главное меню:",
        reply_markup=MAIN_MENU_RU,
    )
    return ConversationHandler.END

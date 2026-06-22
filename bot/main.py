"""
DomApp — Telegram Bot
Стек: python-telegram-bot v20 (async)
"""

import os
import logging
import time
import urllib.request
from dotenv import load_dotenv
from telegram import Update
from telegram.error import Conflict
from telegram.ext import (
    ApplicationBuilder, CommandHandler,
    MessageHandler, filters, ConversationHandler
)

from bot.handlers.start import (
    start_command, phone_received, apartment_received,
    confirm, cancel, STATES
)
from bot.handlers import request as request_handler
from bot.handlers import status as status_handler
from bot.handlers import announcements as announcements_handler
from bot.handlers import ai_chat as ai_chat_handler

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

TOKEN = None


def _force_reset_session():
    """Принудительно закрывает все активные long-polling сессии через Telegram API."""
    global TOKEN
    if not TOKEN:
        return
    base = f"https://api.telegram.org/bot{TOKEN}"
    for i in range(3):
        try:
            # GET getUpdates с timeout=0 закрывает активное long-polling соединение
            urllib.request.urlopen(f"{base}/getUpdates?offset=-1&timeout=0", timeout=5)
            time.sleep(0.3)
            # Ставим webhook чтобы гарантированно сбросить все соединения
            urllib.request.urlopen(
                f"{base}/setWebhook?url=https://example.com&drop_pending_updates=true",
                timeout=5
            )
            time.sleep(0.3)
            # Удаляем webhook — бот будет использовать getUpdates
            urllib.request.urlopen(
                f"{base}/deleteWebhook?drop_pending_updates=true",
                timeout=5
            )
            logger.info(f"Telegram session forcefully reset (attempt {i+1})")
            time.sleep(0.5)
        except Exception as e:
            logger.warning("Session reset error (non-fatal): %s", e.__class__.__name__)


async def error_handler(update: Update, context):
    """Глобальный обработчик ошибок для бота."""
    if isinstance(context.error, Conflict):
        logger.warning("⚠️ 409 Conflict: другой экземпляр бота. Выход для перезапуска...")
        os._exit(1)
    else:
        logger.error(f"Необработанная ошибка: {context.error}")


def _build_app():
    """Создаёт и настраивает Application."""
    app = (
        ApplicationBuilder()
        .token(TOKEN)
        .http_version("1.1")  # Используем HTTP/1.1 вместо HTTP/2
        .build()
    )
    app.add_error_handler(error_handler)

    conv_handler = ConversationHandler(
        entry_points=[CommandHandler("start", start_command)],
        states=STATES,
        fallbacks=[CommandHandler("cancel", cancel)],
    )
    app.add_handler(conv_handler)

    app.add_handler(MessageHandler(
        filters.Regex("^(Подать заявку|Ariza berish)$"),
        request_handler.start
    ))
    app.add_handler(MessageHandler(
        filters.Regex("^(Мои заявки|Mening arizalarim)$"),
        status_handler.list_requests
    ))
    app.add_handler(MessageHandler(
        filters.Regex("^(Объявления|E'lonlar)$"),
        announcements_handler.list_announcements
    ))

    ai_conv = ConversationHandler(
        entry_points=[
            MessageHandler(filters.Regex("^(🤖 AI помощник|🤖 AI yordamchi)$"), ai_chat_handler.start)
        ],
        states={
            ai_chat_handler.CHAT: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, ai_chat_handler.handle_message),
                MessageHandler(filters.PHOTO, ai_chat_handler.handle_photo),
            ],
        },
        fallbacks=[MessageHandler(filters.Regex("^(🔙 Назад в меню|Назад|Меню)$"), ai_chat_handler.cancel)],
    )
    app.add_handler(ai_conv)
    return app


def main():
    global TOKEN
    TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
    if not TOKEN:
        raise RuntimeError("TELEGRAM_BOT_TOKEN не найден в .env")

    # Do not reset Telegram sessions/webhooks by default: a 409 Conflict means
    # another bot is already polling, and startup must not disrupt live workers.
    if os.getenv("TELEGRAM_FORCE_RESET_SESSION") == "1":
        _force_reset_session()

    app = _build_app()
    logger.info("DomApp Bot started (@domapp_bot)")
    app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()

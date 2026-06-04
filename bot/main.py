"""
DomApp — Telegram Bot
Стек: python-telegram-bot v20 (async)
"""

import os
import logging
from dotenv import load_dotenv
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


def main():
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN не найден в .env")

    app = ApplicationBuilder().token(token).build()

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

    # AI Chat (DeepSeek)
    ai_conv = ConversationHandler(
        entry_points=[
            MessageHandler(filters.Regex("^(🤖 AI помощник|🤖 AI yordamchi)$"), ai_chat_handler.start)
        ],
        states={
            ai_chat_handler.CHAT: [MessageHandler(filters.TEXT & ~filters.COMMAND, ai_chat_handler.handle_message)],
        },
        fallbacks=[MessageHandler(filters.Regex("^(🔙 Назад в меню|Назад|Меню)$"), ai_chat_handler.cancel)],
    )
    app.add_handler(ai_conv)

    logger.info("DomApp Bot started (@domapp_bot)")
    app.run_polling()


if __name__ == "__main__":
    main()

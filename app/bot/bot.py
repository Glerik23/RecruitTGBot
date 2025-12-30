"""Ініціалізація та запуск бота"""
from telegram import Bot
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, MessageHandler, filters
from app.config import settings
from app.bot.handlers import (
    start_command,
    callback_handler,
    handle_text_message
)
from app.database import get_db, init_db


def create_bot_application() -> Application:
    """Створити додаток бота"""
    application = Application.builder().token(settings.BOT_TOKEN).build()
    
    # Додаємо обробники
    application.add_handler(CommandHandler("start", start_command))
    application.add_handler(CallbackQueryHandler(callback_handler))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text_message))
    
    return application


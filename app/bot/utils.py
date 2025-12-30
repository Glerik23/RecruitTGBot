"""Утиліти для бота"""
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from app.models.user import User, UserRole
from app.config import settings
from app.utils.helpers import get_role_emoji


def get_db_from_context(context) -> 'Session':
    """Отримати сесію БД з контексту"""
    from app.database import SessionLocal
    
    get_db_func = context.bot_data.get("get_db")
    if get_db_func:
        db_gen = get_db_func()
        return next(db_gen)
    return SessionLocal()


def get_user_from_update(update, db: 'Session'):
    """Отримати користувача з update"""
    from app.services.user_service import UserService
    
    user_data = update.effective_user
    return UserService.get_user_by_telegram_id(db, user_data.id)


def build_main_menu_keyboard(user: User) -> InlineKeyboardMarkup:
    """Побудувати клавіатуру головного меню - тільки WebApp кнопки"""
    base_url = settings.WEB_APP_URL or 'http://localhost:8000'
    
    # Кнопки для кожної ролі
    role_buttons = {
        UserRole.CANDIDATE: ("📱 Відкрити застосунок", f"{base_url}/candidate/application"),
        UserRole.HR: ("📱 Панель HR", f"{base_url}/hr/applications"),
        UserRole.ANALYST: ("📊 Аналітика", f"{base_url}/analyst/dashboard"),
        UserRole.DIRECTOR: ("👥 Панель директора", f"{base_url}/director/roles"),
        UserRole.INTERVIEWER: ("💻 Панель інтерв'юера", f"{base_url}/interviewer/dashboard"),
    }
    
    button_text, url = role_buttons.get(user.role, ("📱 Відкрити застосунок", base_url))
    
    keyboard = [[
        InlineKeyboardButton(button_text, web_app=WebAppInfo(url=url))
    ]]
    
    return InlineKeyboardMarkup(keyboard)


def format_user_greeting(user: User) -> str:
    """Форматувати привітання користувача"""
    name = user.first_name or user.username or 'користувач'
    role_emoji = get_role_emoji(user.role)
    return f"👋 Привіт, {name}!\n{role_emoji} {user.role.value.capitalize()}"


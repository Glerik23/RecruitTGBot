"""Допоміжні функції"""
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from app.models.user import UserRole
from app.constants import RoleEmoji


def get_role_emoji(role: UserRole) -> str:
    """Отримати емодзі для ролі"""
    emoji_map = {
        UserRole.CANDIDATE: RoleEmoji.CANDIDATE,
        UserRole.HR: RoleEmoji.HR,
        UserRole.ANALYST: RoleEmoji.ANALYST,
        UserRole.DIRECTOR: RoleEmoji.DIRECTOR,
        UserRole.INTERVIEWER: RoleEmoji.INTERVIEWER,
    }
    return emoji_map.get(role, "📌")


def normalize_datetime(dt: Optional[datetime]) -> Optional[datetime]:
    """Нормалізувати datetime до UTC"""
    if dt is None:
        return None
    
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    
    return dt.astimezone(timezone.utc)


def format_datetime(dt: Optional[datetime], format_str: str = "%d.%m.%Y %H:%M") -> str:
    """Форматувати datetime"""
    if dt is None:
        return "Невідомо"
    
    normalized = normalize_datetime(dt)
    return normalized.strftime(format_str)


def calculate_time_left(expires_at: Optional[datetime]) -> Optional[str]:
    """Розрахувати час до закінчення"""
    if expires_at is None:
        return None
    
    now = datetime.now(timezone.utc)
    expires = normalize_datetime(expires_at)
    
    if expires <= now:
        return "термін минув"
    
    delta = expires - now
    hours = int(delta.total_seconds() / 3600)
    
    if hours < 1:
        minutes = int(delta.total_seconds() / 60)
        return f"залишилось ~{minutes} хв."
    
    return f"залишилось ~{hours} год."


def get_bot_username_from_app(app_state: Any) -> str:
    """Отримати username бота з app state"""
    try:
        if hasattr(app_state, 'bot_app') and app_state.bot_app:
            bot = app_state.bot_app.bot
            if bot and bot.username:
                return bot.username
    except Exception:
        pass
    return "your_bot"  # Fallback


def validate_telegram_id(telegram_id: Any) -> Optional[int]:
    """Валідувати та конвертувати Telegram ID"""
    if telegram_id is None:
        return None
    
    try:
        return int(telegram_id)
    except (ValueError, TypeError):
        return None



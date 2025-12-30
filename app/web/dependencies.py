"""Залежності для веб-маршрутів"""
from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.user_service import UserService
from app.models.user import UserRole
from app.utils.exceptions import AccessDeniedError, UserNotFoundError
from app.utils.helpers import validate_telegram_id


def get_user_from_request(request: Request, db: Session = Depends(get_db)):
    """Отримати користувача з запиту (з Telegram WebApp)"""
    telegram_id = request.headers.get("X-Telegram-User-Id")
    if not telegram_id:
        raise HTTPException(status_code=401, detail="Не авторизовано")
    
    user_id = validate_telegram_id(telegram_id)
    if not user_id:
        raise HTTPException(status_code=400, detail="Невірний формат Telegram ID")
    
    user = UserService.get_user_by_telegram_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Користувач не знайдений")
    
    return user


def require_role(*allowed_roles: UserRole):
    """Декоратор для перевірки ролі користувача"""
    def role_checker(user = Depends(get_user_from_request)):
        if user.role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Доступ заборонено")
        return user
    return role_checker


def get_bot_username(request: Request) -> str:
    """Отримати username бота з app state"""
    from app.utils.helpers import get_bot_username_from_app
    return get_bot_username_from_app(request.app.state)



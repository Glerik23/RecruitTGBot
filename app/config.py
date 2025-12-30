"""Конфігурація додатку"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Налаштування додатку"""
    
    # Telegram Bot
    BOT_TOKEN: str
    DIRECTOR_TELEGRAM_ID: Optional[str] = None  # Telegram ID директора (автоматично отримує роль)
    AUTO_ASSIGN_DIRECTOR: bool = False  # Автоматично призначати роль директора (для тестування можна встановити False)
    
    def get_director_id(self) -> Optional[int]:
        """Отримати Telegram ID директора як число"""
        if self.DIRECTOR_TELEGRAM_ID:
            try:
                return int(self.DIRECTOR_TELEGRAM_ID)
            except (ValueError, TypeError):
                return None
        return None
    
    # Database
    DATABASE_URL: str
    DB_NAME: str = "recruit_tg"
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "postgres"
    
    # Webhook
    WEBHOOK_URL: Optional[str] = None
    SECRET_KEY: str
    
    # Ngrok
    NGROK_AUTH_TOKEN: Optional[str] = None
    
    # Environment
    ENVIRONMENT: str = "development"
    
    # Web App (буде встановлено автоматично через ngrok або вручну)
    WEB_APP_URL: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()


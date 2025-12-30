"""Утиліти для роботи з ngrok"""
try:
    from pyngrok import ngrok
    NGROK_AVAILABLE = True
except ImportError:
    ngrok = None
    NGROK_AVAILABLE = False

from app.config import settings
import logging

logger = logging.getLogger(__name__)


def setup_ngrok(port: int = 8000) -> str:
    """Налаштувати ngrok тунель"""
    if not NGROK_AVAILABLE:
        raise ImportError("pyngrok не встановлено. Встановіть через: pip install pyngrok")
    
    if settings.NGROK_AUTH_TOKEN:
        ngrok.set_auth_token(settings.NGROK_AUTH_TOKEN)
    
    # Відкриваємо тунель
    tunnel = ngrok.connect(port)
    public_url = tunnel.public_url
    logger.info(f"Ngrok тунель відкрито: {public_url}")
    
    return public_url


def close_ngrok():
    """Закрити ngrok тунель"""
    if not NGROK_AVAILABLE:
        return
    
    ngrok.kill()
    logger.info("Ngrok тунель закрито")


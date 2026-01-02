import bleach
import time
from typing import Dict

def sanitize_html(text: str) -> str:
    """
    Повністю видаляє будь-які HTML-теги з тексту для запобігання XSS.
    """
    if not text:
        return text
    # Стрипаємо всі теги
    return bleach.clean(text, tags=[], attributes={}, strip=True)

class RateLimiter:
    """
    Простий лімітер запитів у пам'яті (для демо/академічних цілей).
    У продакшені краще використовувати Redis.
    """
    def __init__(self, requests_limit: int, window_seconds: int):
        self.requests_limit = requests_limit
        self.window_seconds = window_seconds
        self.cache: Dict[str, list] = {}

    def is_allowed(self, key: str) -> bool:
        now = time.time()
        if key not in self.cache:
            self.cache[key] = [now]
            return True

        # Видаляємо старі запити
        self.cache[key] = [t for t in self.cache[key] if now - t < self.window_seconds]

        if len(self.cache[key]) < self.requests_limit:
            self.cache[key].append(now)
            return True
        
        return False

# Створюємо глобальний лімітер: 1 заявка за 5 хвилин на одного користувача
application_limiter = RateLimiter(requests_limit=1, window_seconds=300)

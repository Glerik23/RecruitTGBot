"""Базовий клас для сервісів"""
from sqlalchemy.orm import Session
from typing import TypeVar, Generic, Optional, Type
from app.utils.exceptions import (
    UserNotFoundError,
    ApplicationNotFoundError,
    InterviewNotFoundError
)

T = TypeVar('T')


class BaseService(Generic[T]):
    """Базовий клас для всіх сервісів"""
    
    @staticmethod
    def get_or_raise(
        db: Session,
        model: Type[T],
        entity_id: int,
        error_class: Type[Exception] = Exception
    ) -> T:
        """Отримати об'єкт або викинути помилку"""
        entity = db.query(model).filter(model.id == entity_id).first()
        if not entity:
            raise error_class(f"{model.__name__} з ID {entity_id} не знайдено")
        return entity
    
    @staticmethod
    def commit_and_refresh(db: Session, entity: T) -> T:
        """Зберегти зміни та оновити об'єкт"""
        db.commit()
        db.refresh(entity)
        return entity



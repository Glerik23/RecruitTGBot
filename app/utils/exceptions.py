"""Користувацькі винятки"""
from fastapi import HTTPException


class RecruitTGException(Exception):
    """Базовий виняток для RecruitTG"""
    pass


class UserNotFoundError(RecruitTGException):
    """Користувач не знайдений"""
    pass


class AccessDeniedError(RecruitTGException):
    """Доступ заборонено"""
    pass


class InviteInvalidError(RecruitTGException):
    """Недійсне запрошення"""
    pass


class ApplicationNotFoundError(RecruitTGException):
    """Заявка не знайдена"""
    pass


class InterviewNotFoundError(RecruitTGException):
    """Собесідування не знайдено"""
    pass


class BusinessError(RecruitTGException):
    """Помилка бізнес-логіки"""
    pass


def handle_service_error(error: Exception) -> HTTPException:
    """Перетворити помилку сервісу в HTTPException"""
    if isinstance(error, UserNotFoundError):
        return HTTPException(status_code=404, detail="Користувач не знайдений")
    elif isinstance(error, AccessDeniedError):
        return HTTPException(status_code=403, detail="Доступ заборонено")
    elif isinstance(error, InviteInvalidError):
        return HTTPException(status_code=400, detail="Недійсне запрошення")
    elif isinstance(error, ApplicationNotFoundError):
        return HTTPException(status_code=404, detail="Заявка не знайдена")
    elif isinstance(error, InterviewNotFoundError):
        return HTTPException(status_code=404, detail="Собесідування не знайдено")
    elif isinstance(error, BusinessError):
        return HTTPException(status_code=400, detail=str(error)) # Business errors are 400
    else:
        return HTTPException(status_code=500, detail="Внутрішня помилка сервера")



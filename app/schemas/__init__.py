"""Pydantic схеми для валідації даних"""
from app.schemas.application import ApplicationCreate
from app.schemas.interview import InterviewConfirm

__all__ = [
    "ApplicationCreate",
    "InterviewConfirm",
]


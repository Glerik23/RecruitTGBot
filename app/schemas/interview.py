from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class InterviewSlotBase(BaseModel):
    id: int
    start_time: datetime
    end_time: datetime
    is_booked: bool

    class Config:
        from_attributes = True


class InterviewConfirm(BaseModel):
    """Підтвердження вибору часу інтерв'ю кандидатом"""
    interview_id: int
    slot_id: int  # Using slot_id instead of raw date

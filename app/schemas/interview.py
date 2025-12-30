from pydantic import BaseModel


class InterviewConfirm(BaseModel):
    """Підтвердження вибору часу інтерв'ю кандидатом"""
    interview_id: int
    selected_date: str  # ISO format

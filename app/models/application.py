"""Моделі заявок"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class ApplicationStatus(enum.Enum):
    """Статуси заявки (Mixed Case to match DB history)"""
    # Legacy (Uppercase in DB)
    PENDING = "PENDING" 
    ACCEPTED = "ACCEPTED" 
    REJECTED = "REJECTED" 
    HIRED = "HIRED" 
    DECLINED = "DECLINED" 
    CANCELLED = "CANCELLED"

    # New Workflow (Lowercase in DB)
    SCREENING_PENDING = "screening_pending"
    SCREENING_SCHEDULED = "screening_scheduled"
    SCREENING_COMPLETED = "screening_completed"
    TECH_PENDING = "tech_pending"
    TECH_SCHEDULED = "tech_scheduled"
    TECH_COMPLETED = "tech_completed"
    
    # Deprecated but kept for migration safety if needed, or remove?
    # Let's keep them commented out or remove if we adhere to new flow strictness.
    # INTERVIEW_SCHEDULED = "interview_scheduled"
    # INTERVIEW_COMPLETED = "interview_completed"


class Application(Base):
    """Модель заявки (резюме)"""
    __tablename__ = "applications"
    
    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    hr_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    tech_interviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Особисті дані
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    
    # Резюме
    position = Column(String(255), nullable=False)  # Позиція, на яку подається
    experience_years = Column(Integer, nullable=True)
    skills = Column(JSON, nullable=True)  # Список навичок
    education = Column(Text, nullable=True)
    previous_work = Column(Text, nullable=True)
    portfolio_url = Column(String(500), nullable=True)
    additional_info = Column(Text, nullable=True)
    
    # Статус
    # Changed from Enum to String to prevent "invalid input value" errors
    # and allow simpler migrations for new statuses.
    status = Column(String, default=ApplicationStatus.PENDING.value, index=True, nullable=False)
    rejection_reason = Column(Text, nullable=True)  # Причина відхилення
    
    # Дати
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Зв'язки
    candidate = relationship("User", foreign_keys=[candidate_id], back_populates="applications")
    hr = relationship("User", foreign_keys=[hr_id], back_populates="hr_applications")
    tech_interviewer = relationship("User", foreign_keys=[tech_interviewer_id], backref="assigned_tech_applications")
    interviews = relationship("Interview", back_populates="application")
    feedbacks = relationship("Feedback", back_populates="application", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Application {self.id} - {self.full_name} ({self.status})>"



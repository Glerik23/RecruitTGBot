"""Моделі собесідувань"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class InterviewType(enum.Enum):
    """Типи собесідувань"""
    HR_SCREENING = "hr_screening"
    TECHNICAL = "technical"


class LocationType(enum.Enum):
    """Тип локації"""
    ONLINE = "online"
    OFFICE = "office"


class InterviewSlot(Base):
    """Слот для співбесіди"""
    __tablename__ = "interview_slots"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("interviews.id"), nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    is_booked = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    interview = relationship("Interview", back_populates="slots")


class Interview(Base):
    """Модель собесідування"""
    __tablename__ = "interviews"
    
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    candidate_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    interviewer_id = Column(Integer, ForeignKey("users.id"), nullable=False) # Generic interviewer (HR or Tech)
    
    # Тип
    interview_type = Column(Enum(InterviewType), nullable=False)
    location_type = Column(Enum(LocationType), nullable=True) # online/office
    
    # Деталі зустрічі (заповнюється після вибору)
    meet_link = Column(String(500), nullable=True)
    address = Column(String(500), nullable=True)

    # Вибраний слот
    selected_time = Column(DateTime(timezone=True), nullable=True)
    is_confirmed = Column(Boolean, default=False)
    
    # Додаткова інформація
    notes = Column(Text, nullable=True)
    
    # Дати
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Зв'язки
    application = relationship("Application", back_populates="interviews")
    candidate = relationship("User", foreign_keys=[candidate_id], back_populates="interviews")
    interviewer = relationship("User", foreign_keys=[interviewer_id], backref="conducted_interviews")
    slots = relationship("InterviewSlot", back_populates="interview", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Interview {self.id} - {self.interview_type.value}>"



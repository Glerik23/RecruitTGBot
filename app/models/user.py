"""Моделі користувачів"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base
import secrets


class UserRole(enum.Enum):
    """Ролі користувачів"""
    CANDIDATE = "candidate"  # Кандидат
    HR = "hr"  # HR менеджер
    ANALYST = "analyst"  # Аналітик
    DIRECTOR = "director"  # Директор (може призначати ролі)
    INTERVIEWER = "interviewer"  # Технічний інтерв'юер


class InviteLink(Base):
    """Одноразові запрошувальні посилання"""
    __tablename__ = "invite_links"
    
    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(64), unique=True, index=True, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    used_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
    is_used = Column(Boolean, default=False)
    
    creator = relationship("User", foreign_keys=[created_by], backref="created_invites")
    user = relationship("User", foreign_keys=[used_by], backref="used_invite")
    
    @staticmethod
    def generate_token() -> str:
        """Генерація унікального токену"""
        return secrets.token_urlsafe(32)


class User(Base):
    """Модель користувача"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    telegram_id = Column(Integer, unique=True, index=True, nullable=False)
    username = Column(String(255), nullable=True)
    first_name = Column(String(255), nullable=True)
    last_name = Column(String(255), nullable=True)
    role = Column(Enum(UserRole), default=UserRole.CANDIDATE, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Зв'язки
    applications = relationship("Application", foreign_keys="Application.candidate_id", back_populates="candidate")
    hr_applications = relationship("Application", foreign_keys="Application.hr_id", back_populates="hr")
    interviews = relationship("Interview", foreign_keys="Interview.candidate_id", back_populates="candidate")
    
    def __repr__(self):
        return f"<User {self.telegram_id} ({self.role.value})>"


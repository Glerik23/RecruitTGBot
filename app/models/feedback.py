"""Модель фідбеку від інтерв'юера"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Feedback(Base):
    """Фідбек (відгук) технічного інтерв'юера"""
    __tablename__ = "feedbacks"
    
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    interviewer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    score = Column(Integer, nullable=False)  # Оцінка (1-10)
    pros = Column(Text, nullable=True)  # Плюси
    cons = Column(Text, nullable=True)  # Мінуси
    summary = Column(Text, nullable=True)  # Загальний висновок
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Зв'язки
    application = relationship("Application", back_populates="feedbacks")
    interviewer = relationship("User", backref="feedbacks")

    def __repr__(self):
        return f"<Feedback app={self.application_id} score={self.score}>"

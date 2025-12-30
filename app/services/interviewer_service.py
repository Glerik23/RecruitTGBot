"""Сервіс для технічних інтерв'юерів"""
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from app.models.application import Application, ApplicationStatus
from app.models.feedback import Feedback
from app.services.base_service import BaseService


class InterviewerService(BaseService[Feedback]):
    """Сервіс для роботи з фідбеками та інтерв'ю"""

    @staticmethod
    def get_assigned_applications(db: Session, interviewer_id: int) -> List[Application]:
        """Отримати заявки, призначені на інтерв'юера"""
        return db.query(Application).filter(
            Application.tech_interviewer_id == interviewer_id,
            # Показуємо тільки активні або ті, де ще немає фінального рішення (хоча історія теж корисна)
            # Для початку показуємо INTERVIEW_SCHEDULED
            # Або всі
        ).order_by(Application.created_at.desc()).all()

    @staticmethod
    def submit_feedback(
        db: Session,
        interviewer_id: int,
        application_id: int,
        data: Dict[str, Any]
    ) -> Feedback:
        """Зберегти фідбек по кандидату"""
        feedback = Feedback(
            application_id=application_id,
            interviewer_id=interviewer_id,
            score=data.get("score"),
            pros=data.get("pros"),
            cons=data.get("cons"),
            summary=data.get("summary")
        )
        db.add(feedback)
        
        # Update status to TECH_COMPLETED
        application = db.query(Application).get(application_id)
        if application:
            application.status = ApplicationStatus.TECH_COMPLETED.value
            db.add(application)
        
        db.commit()
        db.refresh(feedback)
        return feedback

    @staticmethod
    def get_feedback(db: Session, application_id: int) -> Optional[Feedback]:
        """Отримати фідбек по заявці"""
        return db.query(Feedback).filter(Feedback.application_id == application_id).first()

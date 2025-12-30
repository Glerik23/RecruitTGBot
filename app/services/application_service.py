"""Сервіс для роботи з заявками"""
from sqlalchemy.orm import Session
from app.models.application import Application, ApplicationStatus
from app.services.base_service import BaseService
from app.utils.exceptions import ApplicationNotFoundError
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone


class ApplicationService(BaseService[Application]):
    """Сервіс для управління заявками"""
    
    STATUS_GROUPS = {
        "pending": [ApplicationStatus.PENDING.value], 
        "processing": [ApplicationStatus.ACCEPTED.value],
        "interviews": [
            ApplicationStatus.SCREENING_PENDING.value, ApplicationStatus.SCREENING_SCHEDULED.value, 
            ApplicationStatus.SCREENING_COMPLETED.value, ApplicationStatus.TECH_PENDING.value,
            ApplicationStatus.TECH_SCHEDULED.value, ApplicationStatus.TECH_COMPLETED.value
        ],
        "approved": [ApplicationStatus.HIRED.value],
        "rejected": [ApplicationStatus.REJECTED.value, ApplicationStatus.DECLINED.value, ApplicationStatus.CANCELLED.value],
        "archive": [
            ApplicationStatus.HIRED.value,
            ApplicationStatus.REJECTED.value, 
            ApplicationStatus.DECLINED.value, 
            ApplicationStatus.CANCELLED.value
        ]
    }

    @staticmethod
    def create_application(
        db: Session,
        candidate_id: int,
        data: Dict[str, Any]
    ) -> Application:
        """Створити нову заявку"""
        application = Application(
            candidate_id=candidate_id,
            full_name=data.get("full_name"),
            email=data.get("email"),
            phone=data.get("phone"),
            position=data.get("position"),
            experience_years=data.get("experience_years"),
            skills=data.get("skills", []),
            education=data.get("education"),
            previous_work=data.get("previous_work"),
            portfolio_url=data.get("portfolio_url"),
            additional_info=data.get("additional_info"),
            status=ApplicationStatus.PENDING.value
        )
        db.add(application)
        db.commit()
        db.refresh(application)
        return application
    
    @staticmethod
    def get_application(db: Session, application_id: int) -> Optional[Application]:
        """Отримати заявку за ID"""
        return db.query(Application).filter(Application.id == application_id).first()
    
    @staticmethod
    def get_user_applications(db: Session, candidate_id: int) -> List[Application]:
        """Отримати заявки користувача"""
        return db.query(Application).filter(
            Application.candidate_id == candidate_id
        ).order_by(Application.created_at.desc()).all()
    
    @staticmethod
    def get_pending_applications(db: Session) -> List[Application]:
        """Отримати заявки, що очікують розгляду"""
        return db.query(Application).filter(
            Application.status == ApplicationStatus.PENDING.value
        ).order_by(Application.created_at.asc()).all()



    @staticmethod
    def get_all_applications(db: Session, status: Optional[str] = None) -> List[Application]:
        """Отримати всі заявки з опціональним фільтром по статусу (або групі статусів)"""
        query = db.query(Application)
        
        if status and status != "all":
            # Map frontend filter names to status lists
            if status in ApplicationService.STATUS_GROUPS:
                query = query.filter(Application.status.in_(ApplicationService.STATUS_GROUPS[status]))
            else:
                # Fallback to single status match
                try:
                    # Try to find matching enum member
                    status_enum = ApplicationStatus(status)
                    query = query.filter(Application.status == status_enum.value)
                except ValueError:
                    # If invalid status, don't filter (or handle error)
                    pass
                
        return query.order_by(Application.created_at.desc()).all()
                
    @staticmethod
    def get_status_counts(db: Session) -> Dict[str, int]:
        """Отримати кількість заявок для кожної групи статусів"""
        counts = {}
        # This is a bit inefficient (multiple queries instead of one GROUP BY), but safer with the complicated group logic
        # and small scale. For larger scale, refactor to GROUP BY status and then sum in python.
        
        # Optimization: Fetch all status counts in one query
        from sqlalchemy import func
        results = db.query(Application.status, func.count(Application.status)).group_by(Application.status).all()
        status_map = {r[0]: r[1] for r in results}
        
        # Calculate counts for each group
        for group_name, statuses in ApplicationService.STATUS_GROUPS.items():
            count = 0
            for s in statuses:
                count += status_map.get(s, 0)
            counts[group_name] = count
            
        # Total count
        counts["all"] = sum(status_map.values())
        
        return counts

    @staticmethod
    def reject_application(
        db: Session,
        application_id: int,
        hr_id: int,
        reason: str
    ) -> Optional[Application]:
        """Відхилити заявку"""
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            return None
        
        application.status = ApplicationStatus.REJECTED.value
        application.hr_id = hr_id
        application.rejection_reason = reason
        application.reviewed_at = datetime.now(timezone.utc)
        
        return BaseService.commit_and_refresh(db, application)
    
    @staticmethod
    def accept_application(
        db: Session,
        application_id: int,
        hr_id: int
    ) -> Optional[Application]:
        """Прийняти заявку для подальшого планування собесідування"""
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            return None
        
        application.status = ApplicationStatus.ACCEPTED.value
        application.hr_id = hr_id
        application.reviewed_at = datetime.now(timezone.utc)
        
        return BaseService.commit_and_refresh(db, application)
    
    @staticmethod
    def get_hr_applications(db: Session, hr_id: int) -> List[Application]:
        """Отримати заявки, які розглядає HR"""
        return db.query(Application).filter(
            Application.hr_id == hr_id
        ).order_by(Application.created_at.desc()).all()
    
    @staticmethod
    def cancel_application(
        db: Session,
        application_id: int,
        user_id: int
    ) -> Optional[Application]:
        """Скасувати заявку (кандидатом)"""
        application = db.query(Application).filter(
            Application.id == application_id,
            Application.candidate_id == user_id
        ).first()
        
        if not application:
            return None
            
        # Allow cancellation for any active process status
        allowed_statuses = {
            ApplicationStatus.PENDING.value,
            ApplicationStatus.ACCEPTED.value,
            ApplicationStatus.SCREENING_PENDING.value,
            ApplicationStatus.SCREENING_SCHEDULED.value,
            ApplicationStatus.SCREENING_COMPLETED.value,
            ApplicationStatus.TECH_PENDING.value,
            ApplicationStatus.TECH_SCHEDULED.value,
            ApplicationStatus.TECH_COMPLETED.value
        }
        
        if application.status not in allowed_statuses:
            return None
        
        application.status = ApplicationStatus.CANCELLED.value
        
        return BaseService.commit_and_refresh(db, application)

    @staticmethod
    def start_screening(
        db: Session,
        application_id: int
    ) -> Optional[Application]:
        """Почати процес скринінгу (перехід до SCREENING_PENDING)"""
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            return None
        
        application.status = ApplicationStatus.SCREENING_PENDING.value
        return BaseService.commit_and_refresh(db, application)

    @staticmethod
    def move_to_tech_pool(
        db: Session,
        application_id: int
    ) -> Optional[Application]:
        """Відправити заявку в пул технічних інтерв'юерів"""
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            return None
        
        application.status = ApplicationStatus.TECH_PENDING.value
        # Clear specific assignment if any, to allow pooling
        application.tech_interviewer_id = None
        
        return BaseService.commit_and_refresh(db, application)

    @staticmethod
    def assign_tech_interviewer(
        db: Session,
        application_id: int,
        interviewer_id: int
    ) -> Optional[Application]:
        """Призначити конкретного технічного інтерв'юера"""
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            return None
        
        application.tech_interviewer_id = interviewer_id
        # Status remains TECH_PENDING or moves to TECH_SCHEDULED only after scheduling?
        # If assigned directly, it's still pending scheduling by the tech interviewer.
        # But it is now "claimed".
        # Let's keep status as TECH_PENDING but with ID assigned. 
        # Or maybe introduce 'TECH_ASSIGNED'? For now TECH_PENDING + ID is enough to filter "My Assignments".
        
        return BaseService.commit_and_refresh(db, application)


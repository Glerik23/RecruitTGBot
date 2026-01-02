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
        "pending": [ApplicationStatus.SCREENING_PENDING], 
        "processing": [ApplicationStatus.ACCEPTED],
        "interviews": [
            ApplicationStatus.SCREENING_PENDING,
            ApplicationStatus.TECH_PENDING
        ],
        "tech": [
            ApplicationStatus.TECH_PENDING,
            ApplicationStatus.TECH_SCHEDULED,
            ApplicationStatus.TECH_COMPLETED
        ],
        "planned": [
            ApplicationStatus.SCREENING_SCHEDULED,
            ApplicationStatus.TECH_SCHEDULED
        ],
        "approved": [ApplicationStatus.HIRED],
        "rejected": [ApplicationStatus.REJECTED, ApplicationStatus.DECLINED, ApplicationStatus.CANCELLED],
        "archive": [
            ApplicationStatus.HIRED,
            ApplicationStatus.REJECTED, 
            ApplicationStatus.DECLINED, 
            ApplicationStatus.CANCELLED
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
            english_level=data.get("english_level"),
            education=data.get("education"),
            previous_work=data.get("previous_work"),
            portfolio_url=data.get("portfolio_url"),
            additional_info=data.get("additional_info"),
            status=ApplicationStatus.SCREENING_PENDING
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
            Application.status == ApplicationStatus.SCREENING_PENDING
        ).order_by(Application.created_at.asc()).all()



    @staticmethod
    def get_all_applications(
        db: Session, 
        status: Optional[str] = None,
        hr_id: Optional[int] = None,
        interviewer_id: Optional[int] = None
    ) -> List[Application]:
        """Отримати всі заявки з фільтрами по статусу та власнику"""
        query = db.query(Application)
        
        # Ownership filter
        if hr_id:
            # HR sees specific owned OR pending (if they want to claim)
            # Actually, per requirements: 
            # - Inbox (pending): visible to all HRs
            # - Processing/Interviews: visible only to owner
            if status == "pending":
                query = query.filter(
                    Application.status == ApplicationStatus.SCREENING_PENDING,
                    Application.hr_id == None
                )
            elif status == "interviews":
                query = query.filter(
                    Application.status.in_([ApplicationStatus.SCREENING_PENDING, ApplicationStatus.TECH_PENDING]),
                    Application.hr_id == hr_id
                )
            else:
                query = query.filter(Application.hr_id == hr_id)
        elif interviewer_id:
            # Interviewer sees "My Candidates" (ID match)
            # OR "Pool" (tech_pending AND ID is None)
            if status == "pool":
                query = query.filter(
                    Application.status == ApplicationStatus.TECH_PENDING,
                    Application.tech_interviewer_id == None
                )
            else:
                query = query.filter(Application.tech_interviewer_id == interviewer_id)
        
        # Status filter (standard)
        if status and status not in ["all", "pending", "pool"]:
            if status in ApplicationService.STATUS_GROUPS:
                query = query.filter(Application.status.in_(ApplicationService.STATUS_GROUPS[status]))
            else:
                try:
                    status_enum = ApplicationStatus(status)
                    query = query.filter(Application.status == status_enum)
                except ValueError:
                    pass
                
        return query.order_by(Application.created_at.desc()).all()
                
    @staticmethod
    def get_status_counts(
        db: Session, 
        hr_id: Optional[int] = None,
        interviewer_id: Optional[int] = None
    ) -> Dict[str, int]:
        """Отримати кількість заявок для кожної групи статусів з урахуванням власності"""
        from sqlalchemy import func
        
        # Base query for counts
        query = db.query(Application.status, func.count(Application.status))
        
        # Apply ownership filtering for counts as well
        if hr_id:
            # For HR: counts for owned apps + total pending (which they can claim)
            # Actually, standard tabs in HR dashboard should probably show TOTAL pending 
            # and OWNED for others.
            pass # We will handle filtering inside the loop for specific groups
            
        results = query.group_by(Application.status).all()
        status_map = {r[0]: r[1] for r in results}
        
        # More precise counts if filtered
        counts = {}
        for group_name, statuses in ApplicationService.STATUS_GROUPS.items():
            if hr_id:
                if group_name == "pending":
                    # Inbox: NOT owned, SCREENING_PENDING
                    count = db.query(func.count(Application.id)).filter(
                        Application.status == ApplicationStatus.SCREENING_PENDING,
                        Application.hr_id == None
                    ).scalar()
                elif group_name == "interviews":
                    # My invitations: Owned, SCREENING_PENDING or TECH_PENDING
                    count = db.query(func.count(Application.id)).filter(
                        Application.status.in_([ApplicationStatus.SCREENING_PENDING, ApplicationStatus.TECH_PENDING]),
                        Application.hr_id == hr_id
                    ).scalar()
                else:
                    # Regular tabs (processing, planned, archive) show only OWNED
                    count = db.query(func.count(Application.id)).filter(
                        Application.status.in_(statuses),
                        Application.hr_id == hr_id
                    ).scalar()
            elif interviewer_id and group_name == "tech":
                 # Interviewer counts their OWN tech apps
                 count = db.query(func.count(Application.id)).filter(
                    Application.status.in_(statuses),
                    Application.tech_interviewer_id == interviewer_id
                ).scalar()
            else:
                # Inbox (pending) or General Pool or Standard
                count = 0
                for s in statuses:
                    count += status_map.get(s, 0)
            
            counts[group_name] = count or 0
            
        # Total count
        counts["all"] = sum(counts.values()) if not hr_id else counts.get("pending", 0) + sum(v for k,v in counts.items() if k != "pending" and k != "all")
        
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
        
        application.status = ApplicationStatus.REJECTED
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
        
        application.status = ApplicationStatus.ACCEPTED
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
            ApplicationStatus.SCREENING_PENDING,
            ApplicationStatus.SCREENING_SCHEDULED,
            ApplicationStatus.SCREENING_COMPLETED,
            ApplicationStatus.TECH_PENDING,
            ApplicationStatus.TECH_SCHEDULED,
            ApplicationStatus.TECH_COMPLETED
        }
        
        if application.status not in allowed_statuses:
            return None
        
        application.status = ApplicationStatus.CANCELLED
        
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
        
        application.status = ApplicationStatus.SCREENING_PENDING
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
        
        application.status = ApplicationStatus.TECH_PENDING
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

    @staticmethod
    def hire_candidate(
        db: Session,
        application_id: int,
        hr_id: int
    ) -> Optional[Application]:
        """Остаточно прийняти кандидата на роботу (Hired)"""
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            return None
        
        application.status = ApplicationStatus.HIRED
        application.hr_id = hr_id
        application.reviewed_at = datetime.now(timezone.utc)
        
        return BaseService.commit_and_refresh(db, application)


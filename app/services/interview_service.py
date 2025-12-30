"""Сервіс для роботи з співбесідами"""
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Dict, Optional, Any
from app.models.interview import Interview, InterviewType, LocationType
from app.models.application import Application, ApplicationStatus
from app.services.base_service import BaseService
from app.utils.exceptions import BusinessError, InterviewNotFoundError

class InterviewService(BaseService[Interview]):
    """Сервіс для управління розкладом та зустрічами"""

    @staticmethod
    def create_scheduling_request(
        db: Session,
        application_id: int,
        interviewer_id: int,
        interview_type: InterviewType,
        available_slots: List[Dict[str, str]] # [{'start': iso, 'end': iso}]
    ) -> Interview:
        """Створити запит на планування зустрічі"""
        if not available_slots:
            raise BusinessError("Must provide at least one available slot")
            
        # Verify application exists
        app = db.query(Application).get(application_id)
        if not app:
            raise BusinessError("Application not found")

        interview = Interview(
            application_id=application_id,
            candidate_id=app.candidate_id,
            interviewer_id=interviewer_id,
            interview_type=interview_type,
            available_slots=available_slots,
            is_confirmed=False
        )
        db.add(interview)
        
        # Update Application status
        if interview_type == InterviewType.HR_SCREENING:
            app.status = ApplicationStatus.SCREENING_PENDING.value
        elif interview_type == InterviewType.TECHNICAL:
            # If creating a specific tech interview request
            # Usually tech interview is scheduled from pool or directly
            app.status = ApplicationStatus.TECH_PENDING.value 
            
            # If we wanted to auto-confirm, we would need selected_time passed in.
            # But since we are passing available_slots, it is a request. 
        
        db.commit()
        db.refresh(interview)
        db.refresh(app)
        return interview

    @staticmethod
    def get_interview(db: Session, interview_id: int) -> Optional[Interview]:
        """Отримати співбесіду за ID"""
        return db.query(Interview).filter(Interview.id == interview_id).first()

    @staticmethod
    def select_slot(
        db: Session,
        interview_id: int,
        user_id: int,
        slot_start: datetime
    ) -> Interview:
        """Кандидат обирає слот"""
        interview = db.query(Interview).get(interview_id)
        if not interview:
            raise InterviewNotFoundError("Interview request not found")
            
        if interview.candidate_id != user_id:
            raise BusinessError("Not authorized to schedule this interview")
            
        # Logic to validate slot_start is in available_slots could be added here
        
        interview.selected_time = slot_start
        # Candidate picked time. Now waiting for conformation (link/address) from Host.
        
        db.commit()
        db.refresh(interview)
        return interview

    @staticmethod
    def finalize_interview(
        db: Session,
        interview_id: int,
        user_id: int, # HR or Tech confirming
        location_type: LocationType,
        details: Dict[str, str] # {meet_link, address}
    ) -> Interview:
        """Фіналізація (підтвердження місця/посилання)"""
        interview = db.query(Interview).get(interview_id)
        if not interview:
            raise InterviewNotFoundError("Interview not found")
            
        # Simple permission check
        # if interview.interviewer_id != user_id:
        #    raise BusinessError("Not authorized")

        interview.location_type = location_type
        interview.meet_link = details.get("meet_link")
        interview.address = details.get("address")
        interview.is_confirmed = True
        
        # Update app status to scheduled/confirmed
        if interview.interview_type == InterviewType.HR_SCREENING:
            interview.application.status = ApplicationStatus.SCREENING_SCHEDULED.value
        elif interview.interview_type == InterviewType.TECHNICAL:
            interview.application.status = ApplicationStatus.TECH_SCHEDULED.value
            
        db.commit()
        db.refresh(interview)
        return interview

    @staticmethod
    def get_candidate_interviews(db: Session, candidate_id: int) -> List[Interview]:
        """Отримати співбесіди кандидата"""
        # Filter where selected_time is set or confirmed?
        return db.query(Interview).filter(
            Interview.candidate_id == candidate_id
        ).order_by(Interview.id.desc()).all()
    
    @staticmethod
    def get_pending_interviews(db: Session, candidate_id: int) -> List[Interview]:
         """Отримати запрошення де ще не вибрано час"""
         return db.query(Interview).filter(
             Interview.candidate_id == candidate_id,
             Interview.selected_time == None
         ).all()


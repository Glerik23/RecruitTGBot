"""Сервіс для роботи з співбесідами"""
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Dict, Optional, Any
from app.models.interview import Interview, InterviewType, LocationType, InterviewSlot
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
        available_slots: List[Dict[str, str]], # [{'start': iso, 'end': iso}]
        location_type: Optional[LocationType] = None,
        details: Optional[Dict[str, str]] = None
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
            location_type=location_type,
            meet_link=details.get("meet_link") if details else None,
            address=details.get("address") if details else None,
            is_confirmed=False
        )
        db.add(interview)
        db.flush() # Get interview ID for slots

        # Create Normalized Slots
        for slot_data in available_slots:
            slot = InterviewSlot(
                interview_id=interview.id,
                start_time=datetime.fromisoformat(slot_data['start'].replace('Z', '+00:00')),
                end_time=datetime.fromisoformat(slot_data['end'].replace('Z', '+00:00')),
                is_booked=False
            )
            db.add(slot)
            
        # Update Application status
        if interview_type == InterviewType.HR_SCREENING:
            app.status = ApplicationStatus.SCREENING_PENDING
        elif interview_type == InterviewType.TECHNICAL:
            app.status = ApplicationStatus.TECH_PENDING 
        
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
        slot_id: int
    ) -> Interview:
        """Кандидат обирає слот"""
        interview = db.query(Interview).get(interview_id)
        if not interview:
            raise InterviewNotFoundError("Interview request not found")
            
        if interview.candidate_id != user_id:
            raise BusinessError("Not authorized to schedule this interview")
            
        slot = db.query(InterviewSlot).filter(
            InterviewSlot.id == slot_id,
            InterviewSlot.interview_id == interview_id
        ).first()
        
        if not slot or slot.is_booked:
            raise BusinessError("Selected slot is not available")
            
        interview.selected_time = slot.start_time
        slot.is_booked = True
        
        # Auto-confirm if location details are already present
        if interview.location_type:
            interview.is_confirmed = True
            if interview.interview_type == InterviewType.HR_SCREENING:
                interview.application.status = ApplicationStatus.SCREENING_SCHEDULED
            elif interview.interview_type == InterviewType.TECHNICAL:
                interview.application.status = ApplicationStatus.TECH_SCHEDULED
        
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
            interview.application.status = ApplicationStatus.SCREENING_SCHEDULED
        elif interview.interview_type == InterviewType.TECHNICAL:
            interview.application.status = ApplicationStatus.TECH_SCHEDULED
            
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


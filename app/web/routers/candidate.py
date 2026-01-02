from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime
from app.database import get_db
from app.services.application_service import ApplicationService
from app.services.interview_service import InterviewService
from app.web.dependencies import require_role
from app.models.user import UserRole
from app.schemas.application import ApplicationCreate
from app.schemas.interview import InterviewConfirm

router = APIRouter(prefix="/candidate", tags=["candidate"])

@router.post("/application")
async def create_application(
    request: Request,
    data: ApplicationCreate,
    user = Depends(require_role(UserRole.CANDIDATE)),
    db: Session = Depends(get_db)
):
    """Create a new application"""
    from app.utils.security import application_limiter
    if not application_limiter.is_allowed(str(user.id)):
        raise HTTPException(
            status_code=429, 
            detail="Ви вже надіслали заявку нещодавно. Будь ласка, зачекайте 5 хвилин."
        )
    
    application = ApplicationService.create_application(
        db,
        user.id,
        data.dict()
    )
    
    # Notify HR about new application
    from app.services.notification_service import NotificationService
    await NotificationService.notify_hr_new_application(
        request, 
        db, 
        application.full_name, 
        application.position
    )
    
    return {
        "success": True,
        "application_id": application.id,
        "message": "Application created successfully!"
    }


@router.get("/applications")
async def get_my_applications(
    user = Depends(require_role(UserRole.CANDIDATE)),
    db: Session = Depends(get_db)
):
    """Get candidate's applications"""
    
    applications = ApplicationService.get_user_applications(db, user.id)
    
    return {
        "applications": [
            {
                "id": app.id,
                "position": app.position,
                "status": app.status,
                "created_at": app.created_at.isoformat(),
                "rejection_reason": app.rejection_reason
            }
            for app in applications
        ]
    }


@router.get("/interviews")
async def get_my_interviews(
    user = Depends(require_role(UserRole.CANDIDATE)),
    db: Session = Depends(get_db)
):
    """Get candidate's interviews"""
    
    interviews = InterviewService.get_candidate_interviews(db, user.id)
    
    return {
        "interviews": [
            {
                "id": interview.id,
                "application_id": interview.application_id,
                "interview_type": interview.interview_type.value,
                "location_type": interview.location_type.value if interview.location_type else None,
                "meet_link": interview.meet_link,
                "address": interview.address,
                "slots": [
                    {
                        "id": slot.id,
                        "start_time": slot.start_time.isoformat(),
                        "end_time": slot.end_time.isoformat(),
                        "is_booked": slot.is_booked
                    }
                    for slot in interview.slots
                ],
                "selected_time": interview.selected_time.isoformat() if interview.selected_time else None,
                "is_confirmed": interview.is_confirmed,
                "notes": interview.notes
            }
            for interview in interviews
        ]
    }


@router.post("/interviews/select-slot")
async def select_slot(
    request: Request,
    data: InterviewConfirm,
    user = Depends(require_role(UserRole.CANDIDATE)),
    db: Session = Depends(get_db)
):
    """Select interview slot"""
    
    # Using new service method
    try:
        interview = InterviewService.select_slot(
            db,
            data.interview_id,
            user.id,
            data.slot_id
        )
        
        # Notify HR or Interviewer that candidate picked a slot
        if interview.interviewer and interview.interviewer.telegram_id:
            from app.services.notification_service import NotificationService
            datetime_str = interview.selected_time.strftime("%d.%m.%Y о %H:%M")
            await NotificationService.notify_staff_slot_selected(
                request,
                interview.interviewer.telegram_id,
                interview.application.full_name,
                interview.application.position,
                datetime_str,
                interview.interview_type.value
            )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return {
        "success": True,
        "message": "Slot selected! Waiting for confirmation."
    }


@router.post("/application/{application_id}/cancel")
async def cancel_application(
    application_id: int,
    user = Depends(require_role(UserRole.CANDIDATE)),
    db: Session = Depends(get_db)
):
    """Cancel application"""
    
    application = ApplicationService.cancel_application(
        db,
        application_id,
        user.id
    )
    
    if not application:
        raise HTTPException(
            status_code=400, 
            detail="Cannot cancel application. It might be processed already or does not exist."
        )
    
    return {
        "success": True,
        "message": "Application cancelled successfully",
        "application_id": application.id,
        "new_status": application.status
    }

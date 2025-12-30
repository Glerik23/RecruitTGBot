from fastapi import APIRouter, Depends, HTTPException
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
    data: ApplicationCreate,
    user = Depends(require_role(UserRole.CANDIDATE)),
    db: Session = Depends(get_db)
):
    """Create a new application"""
    
    application = ApplicationService.create_application(
        db,
        user.id,
        data.dict()
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
                "available_slots": interview.available_slots,
                "selected_time": interview.selected_time.isoformat() if interview.selected_time else None,
                "is_confirmed": interview.is_confirmed,
                "notes": interview.notes
            }
            for interview in interviews
        ]
    }


@router.post("/interviews/select-slot")
async def select_slot(
    data: InterviewConfirm,
    user = Depends(require_role(UserRole.CANDIDATE)),
    db: Session = Depends(get_db)
):
    """Select interview slot"""
    
    selected_date = datetime.fromisoformat(data.selected_date)
    # Using new service method
    try:
        InterviewService.select_slot(
            db,
            data.interview_id,
            user.id,
            selected_date
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

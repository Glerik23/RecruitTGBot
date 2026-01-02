from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any

from app.database import get_db
from app.models.user import UserRole
from app.services.application_service import ApplicationService
from app.services.interview_service import InterviewService
from app.services.notification_service import NotificationService
from app.models.interview import InterviewType, LocationType
from app.web.dependencies import require_role

router = APIRouter(prefix="/hr", tags=["hr"])

@router.get("/applications")
async def get_hr_applications(
    status: Optional[str] = None,
    user = Depends(require_role(UserRole.HR)),
    db: Session = Depends(get_db)
):
    """Get applications for HR"""
    
    if status:
        applications = ApplicationService.get_all_applications(db, status=status, hr_id=user.id)
    else:
        # For 'pending' (Inbox), we don't pass hr_id because anyone can claim
        applications = ApplicationService.get_all_applications(db, status="pending")
    
    # Get counts for tabs - filtered by ownership
    counts = ApplicationService.get_status_counts(db, hr_id=user.id)
    
    return {
        "counts": counts,
        "applications": [
            {
                "id": app.id,
                "candidate_name": app.full_name,
                "email": app.email,
                "phone": app.phone,
                "position": app.position,
                "experience_years": app.experience_years,
                "skills": app.skills,
                "skills_details": app.skills_details,
                "english_level": app.english_level,
                "education": app.education,
                "previous_work": app.previous_work,
                "portfolio_url": app.portfolio_url,
                "additional_info": app.additional_info,
                "status": app.status,
                "created_at": app.created_at.isoformat(),
                "screening_info": next((
                    {
                        "has_selected_time": i.selected_time is not None
                    }
                    for i in app.interviews
                    if i.interview_type == InterviewType.HR_SCREENING
                ), None)
            }
            for app in applications
        ]
    }


@router.get("/applications/{application_id}")
async def get_application_detail(
    application_id: int,
    user = Depends(require_role(UserRole.HR)),
    db: Session = Depends(get_db)
):
    """Get application details"""
    
    application = ApplicationService.get_application(db, application_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    return {
        "id": application.id,
        "candidate_name": application.full_name,
        "email": application.email,
        "phone": application.phone,
        "position": application.position,
        "experience_years": application.experience_years,
        "skills": application.skills,
        "skills_details": application.skills_details,
        "english_level": application.english_level,
        "education": application.education,
        "previous_work": application.previous_work,
        "portfolio_url": application.portfolio_url,
        "additional_info": application.additional_info,
        "status": application.status,
        "rejection_reason": application.rejection_reason,
        "tech_interviewer_name": application.tech_interviewer.full_name if application.tech_interviewer else None,
        "created_at": application.created_at.isoformat(),
        "feedbacks": [
            {
                "interviewer_name": f.interviewer.full_name,
                "score": f.score,
                "pros": f.pros,
                "cons": f.cons,
                "summary": f.summary,
                "created_at": f.created_at.isoformat()
            }
            for f in application.feedbacks
        ] if application.feedbacks else [],
        "interviews": [
            {
                "id": i.id,
                "type": i.interview_type.value,
                "location": i.location_type.value if i.location_type else None,
                "slots": i.available_slots,
                "selected_time": i.selected_time.isoformat() if i.selected_time else None,
                "confirmed": i.is_confirmed,
                "link": i.meet_link,
                "address": i.address
            }
            for i in application.interviews
        ] if application.interviews else []
    }


@router.post("/applications/{application_id}/accept")
async def accept_application_endpoint(
    request: Request,
    application_id: int,
    user = Depends(require_role(UserRole.HR)),
    db: Session = Depends(get_db)
):
    """Accept application"""
    application = ApplicationService.accept_application(db, application_id, user.id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Send notification to candidate
    await NotificationService.notify_application_accepted(
        request,
        application.candidate.telegram_id,
        application.position
    )

    # Notify other HRs that this application is taken
    hr_name = f"{user.first_name} {user.last_name}".strip() or user.username or "HR"
    await NotificationService.notify_hr_application_claimed(
        request,
        db,
        hr_name,
        application.full_name,
        application.position
    )
    
    return {
        "success": True,
        "message": "Application accepted",
        "application": {
            "id": application.id,
            "status": application.status
        }
    }


@router.post("/applications/{application_id}/reject")
async def reject_application_endpoint(
    request: Request,
    application_id: int,
    data: Dict[str, Any],
    user = Depends(require_role(UserRole.HR)),
    db: Session = Depends(get_db)
):
    """Reject application"""
    reason = data.get("reason", "")
    if not reason:
        raise HTTPException(status_code=400, detail="Rejection reason is required")
    
    application = ApplicationService.reject_application(db, application_id, user.id, reason)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Send notification via bot
    await NotificationService.notify_candidate_result(
        request,
        application.candidate.telegram_id,
        application.position,
        "rejected",
        reason
    )
    return {
        "success": True,
        "message": "Application rejected",
        "application": {
            "id": application.id,
            "status": application.status
        }
    }


@router.post("/applications/{application_id}/hire")
async def hire_candidate_endpoint(
    request: Request,
    application_id: int,
    user = Depends(require_role(UserRole.HR)),
    db: Session = Depends(get_db)
):
    """Hire candidate"""
    application = ApplicationService.hire_candidate(db, application_id, user.id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Send notification via bot
    await NotificationService.notify_candidate_result(
        request,
        application.candidate.telegram_id,
        application.position,
        "hired"
    )
    
    return {
        "success": True,
        "message": "Candidate hired",
        "application": {
            "id": application.id,
            "status": application.status
        }
    }


@router.post("/applications/{application_id}/screening/start")
async def start_screening(
    request: Request,
    application_id: int,
    data: Dict[str, Any],
    user = Depends(require_role(UserRole.HR)),
    db: Session = Depends(get_db)
):
    """Start HR screening process (define slots)"""
    slots = data.get("slots") # List of {start: iso, end: iso}
    if not slots:
        raise HTTPException(status_code=400, detail="Slots are required")
        
    # Start status
    app = ApplicationService.start_screening(db, application_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
        
    # Location details
    location_type = data.get("location_type")
    details = data.get("details", {})
    
    loc_enum = None
    if location_type:
        try:
            loc_enum = LocationType(location_type)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid location type")

    # Create interview request
    interview = InterviewService.create_scheduling_request(
        db,
        application_id,
        user.id,
        InterviewType.HR_SCREENING,
        slots,
        loc_enum,
        details
    )
    
    # Notify candidate about available slots
    if app.candidate and app.candidate.telegram_id:
        await NotificationService.notify_slots_available(
            request,
            app.candidate.telegram_id,
            app.position,
            "hr_screening",
            slots,
            location_type or "online",
            details
        )
    
    return {"success": True, "interview_id": interview.id}

@router.post("/applications/{application_id}/screening/finalize")
async def finalize_screening(
    request: Request,
    application_id: int,
    data: Dict[str, Any],
    user = Depends(require_role(UserRole.HR)),
    db: Session = Depends(get_db)
):
    """Finalize screening (confirm location/link after candidate picked slot)"""
    interview_id = data.get("interview_id")
    location_type = data.get("location_type") # online/office
    details = data.get("details") # {meet_link, address}
    
    try:
        loc_enum = LocationType(location_type)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid location type")
        
    try:
        interview = InterviewService.finalize_interview(
            db, interview_id, user.id, loc_enum, details
        )
        
        # Notify candidate about confirmed interview
        if interview.candidate and interview.candidate.telegram_id and interview.selected_time:
            datetime_str = interview.selected_time.strftime("%d.%m.%Y о %H:%M")
            await NotificationService.notify_interview_confirmed(
                request,
                interview.candidate.telegram_id,
                interview.application.position,
                "hr_screening",
                datetime_str,
                location_type,
                details or {}
            )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    return {"success": True}

@router.post("/applications/{application_id}/tech/move")
async def move_to_tech(
    request: Request,
    application_id: int,
    data: Dict[str, Any],
    user = Depends(require_role(UserRole.HR)),
    db: Session = Depends(get_db)
):
    """Move to technical stage (Assign or Pool)"""
    mode = data.get("mode") # 'assign' or 'pool'
    interviewer_id = data.get("interviewer_id")
    
    app = ApplicationService.get_application(db, application_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    if mode == "assign":
        if not interviewer_id:
            raise HTTPException(status_code=400, detail="Interviewer ID required for assignment")
        interviewer = ApplicationService.assign_tech_interviewer(db, application_id, int(interviewer_id))
        
        # Notify interviewer
        if interviewer and interviewer.telegram_id:
            await NotificationService.notify_interviewer_assigned(
                request,
                interviewer.telegram_id,
                app.full_name,
                app.position
            )
    elif mode == "pool":
        ApplicationService.move_to_tech_pool(db, application_id)
    else:
        raise HTTPException(status_code=400, detail="Invalid mode")
        
    return {"success": True}

@router.post("/applications/{application_id}/assign-interviewer")
async def assign_interviewer_endpoint(
    request: Request,
    application_id: int,
    data: Dict[str, Any],
    user = Depends(require_role(UserRole.HR)),
    db: Session = Depends(get_db)
):
    """Legacy endpoint: Assign a technical interviewer (Redirects to new logic)"""
    return await move_to_tech(request, application_id, {"mode": "assign", "interviewer_id": data.get("interviewer_id")}, user, db)


@router.get("/interviewers")
async def get_interviewers(
    user = Depends(require_role(UserRole.HR)),
    db: Session = Depends(get_db)
):
    """Get list of technical interviewers"""
    from app.services.user_service import UserService
    interviewers = UserService.get_users_by_role(db, UserRole.INTERVIEWER)
    
    return {
        "interviewers": [
            {
                "id": u.id,
                "first_name": u.first_name,
                "last_name": u.last_name,
                "username": u.username,
                "full_name": f"{u.first_name or ''} {u.last_name or ''}".strip() or u.username or "Unknown"
            }
            for u in interviewers
        ]
    }

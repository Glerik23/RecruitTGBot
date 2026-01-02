from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import Dict, Any
import traceback

from app.database import get_db
from app.services.interviewer_service import InterviewerService
from app.services.application_service import ApplicationService
from app.services.interview_service import InterviewService
from app.services.notification_service import NotificationService
from app.web.dependencies import require_role
from app.models.user import UserRole
from app.models.interview import Interview, InterviewType, LocationType
from app.models.application import Application, ApplicationStatus

router = APIRouter(prefix="/interviewer", tags=["interviewer"])

@router.get("/applications")
async def get_dashboard_data(
    user = Depends(require_role(UserRole.INTERVIEWER)),
    db: Session = Depends(get_db)
):
    """Get dashboard data: assigned applications and pool"""
    # My Candidates: tech_interviewer_id == current_user.id (actively processing)
    # Filter them to exclude archived ones for the main "My Candidates" list if needed, 
    # but based on current logic let's keep it simple.
    assigned = ApplicationService.get_all_applications(db, interviewer_id=user.id)
    
    # Archive: HIRED/REJECTED/CANCELLED where tech_interviewer_id == user.id
    archive = ApplicationService.get_all_applications(db, status="archive", interviewer_id=user.id)
    
    # Pool: tech_pending AND tech_interviewer_id is None
    pool = ApplicationService.get_all_applications(db, status="pool", interviewer_id=user.id)
    
    def serialize(app):
        return {
            "id": app.id,
            "candidate_name": app.full_name,
            "position": app.position,
            "status": app.status,
            "experience_years": app.experience_years,
            "skills": app.skills,
            "english_level": app.english_level,
            "created_at": app.created_at.isoformat(),
            "tech_interviewer_id": app.tech_interviewer_id
        }

    return {
        "my_candidates": [serialize(app) for app in assigned if app.status not in ApplicationService.STATUS_GROUPS["archive"]],
        "archive": [serialize(app) for app in archive],
        "pool": [serialize(app) for app in pool]
    }

@router.get("/applications/{application_id}")
async def get_application_detail(
    application_id: int,
    user = Depends(require_role(UserRole.INTERVIEWER)),
    db: Session = Depends(get_db)
):
    """Get application details for interviewer"""
    app = ApplicationService.get_application(db, application_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
        
    # Check if this interviewer is assigned
    if app.tech_interviewer_id != user.id:
        # Allow viewing if it's in the technical pool (unassigned)
        is_in_pool = (app.status == ApplicationStatus.TECH_PENDING and app.tech_interviewer_id is None)
        if not is_in_pool:
            raise HTTPException(status_code=403, detail="Доступ заборонено (ви не є власником цієї заявки)")

    
    # Fetch active technical interview
    interview = db.query(Interview).filter(
        Interview.application_id == application_id,
        Interview.interview_type == InterviewType.TECHNICAL
    ).order_by(Interview.created_at.desc()).first()
    
    interview_data = None
    if interview:
        interview_data = {
            "id": interview.id,
            "selected_time": interview.selected_time.isoformat() if interview.selected_time else None,
            "is_confirmed": interview.is_confirmed,
            "location_type": interview.location_type.value if interview.location_type else None,
            "link": interview.meet_link,
            "address": interview.address
        }

    return {
        "id": app.id,
        "candidate_name": app.full_name,
        "email": app.email,
        "phone": app.phone,
        "position": app.position,
        "experience_years": app.experience_years,
        "skills": app.skills,
        "english_level": app.english_level,
        "education": app.education,
        "previous_work": app.previous_work,
        "portfolio_url": app.portfolio_url,
        "additional_info": app.additional_info,
        "status": app.status,
        "created_at": app.created_at.isoformat(),
        "tech_interviewer_id": app.tech_interviewer_id,
        "tech_interviewer_name": app.tech_interviewer.full_name if app.tech_interviewer else None,
        "feedbacks": [
            {
                "interviewer_name": f.interviewer.full_name,
                "score": f.score,
                "pros": f.pros,
                "cons": f.cons,
                "summary": f.summary,
                "created_at": f.created_at.isoformat()
            }
            for f in app.feedbacks
        ] if app.feedbacks else [],
        "active_interview": interview_data
    }

@router.get("/applications/{application_id}/feedback")
async def get_feedback(
    application_id: int,
    user = Depends(require_role(UserRole.INTERVIEWER)),
    db: Session = Depends(get_db)
):
    """Get feedback for an application"""
    # Check if assigned?
    # For now, simplistic check
    feedback = InterviewerService.get_feedback(db, application_id, user.id)
    if not feedback:
        return {"feedback": None}
        
    return {
        "feedback": {
            "score": feedback.score,
            "pros": feedback.pros,
            "cons": feedback.cons,
            "summary": feedback.summary
        }
    }

@router.post("/applications/{application_id}/feedback")
async def submit_feedback(
    request: Request,
    application_id: int,
    data: Dict[str, Any],
    user = Depends(require_role(UserRole.INTERVIEWER)),
    db: Session = Depends(get_db)
):
    """Submit feedback for a candidate"""
    # Ensure application is assigned to this interviewer?
    # Skipped for brevity, but recommended in prod.
    
    feedback = InterviewerService.submit_feedback(db, user.id, application_id, data)
    
    # Notify HR managers
    app = ApplicationService.get_application(db, application_id)
    if app:
        interviewer_name = user.full_name
        await NotificationService.notify_hr_feedback_submitted(
            request, 
            db, 
            app.full_name, 
            app.position, 
            interviewer_name, 
            feedback.score
        )
    
    return {
        "success": True,
        "message": "Feedback submitted successfully"
    }
@router.post("/applications/{application_id}/claim")
async def claim_application(
    request: Request,
    application_id: int,
    user = Depends(require_role(UserRole.INTERVIEWER)),
    db: Session = Depends(get_db)
):
    """Claim application from pool"""
    app = ApplicationService.assign_tech_interviewer(db, application_id, user.id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
        
    # Notify colleagues
    interviewer_name = f"{user.first_name} {user.last_name}".strip() or user.username or "Експерт"
    await NotificationService.notify_interviewer_claimed(
        request,
        db,
        interviewer_name,
        app.full_name,
        app.position
    )
    
    return {"success": True, "message": "Application claimed"}

@router.get("/pool")
async def get_pool_applications(
    user = Depends(require_role(UserRole.INTERVIEWER)),
    db: Session = Depends(get_db)
):
    """Get unassigned applications in the tech pool"""
    apps = db.query(Application).filter(
        Application.status == ApplicationStatus.TECH_PENDING,
        Application.tech_interviewer_id == None
    ).order_by(Application.created_at.asc()).all()
    
    return {
        "applications": [
            {
                "id": app.id,
                "candidate_name": app.full_name,
                "position": app.position,
                "status": app.status,
                "created_at": app.created_at.isoformat(),
            }
            for app in apps
        ]
    }

@router.post("/pool/{application_id}/claim")
async def claim_application(
    application_id: int,
    user = Depends(require_role(UserRole.INTERVIEWER)),
    db: Session = Depends(get_db)
):
    """Claim an application from the pool"""
    try:
        # Check if available
        app = ApplicationService.get_application(db, application_id)
        if not app:
            raise HTTPException(status_code=404, detail="Application not found")
            
        if app.status != ApplicationStatus.TECH_PENDING or app.tech_interviewer_id is not None:
             raise HTTPException(status_code=400, detail=f"Application not available for claim (Status: {app.status}, Assigned: {app.tech_interviewer_id})")
             
        ApplicationService.assign_tech_interviewer(db, application_id, user.id)
        
        return {"success": True, "message": "Application claimed"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR CLAIMING APPLICATION: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Internal Error: {str(e)}")


@router.post("/applications/{application_id}/interview/schedule")
async def schedule_interview(
    request: Request,
    application_id: int,
    data: Dict[str, Any],
    user = Depends(require_role(UserRole.INTERVIEWER)),
    db: Session = Depends(get_db)
):
    """Define available slots for technical interview"""
    slots = data.get("slots")
    if not slots:
        raise HTTPException(status_code=400, detail="Slots are required")
        
    # Check assignment
    app = ApplicationService.get_application(db, application_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
        
    if app.tech_interviewer_id != user.id:
        raise HTTPException(status_code=403, detail="Not assigned to this application")
        
    # Create interview request (Technical)
    location_type = data.get("location_type")
    details = data.get("details", {})
    
    loc_enum = None
    if location_type:
        try:
            loc_enum = LocationType(location_type)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid location type")

    try:
        interview = InterviewService.create_scheduling_request(
            db,
            application_id,
            user.id,
            InterviewType.TECHNICAL,
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
                "technical",
                slots,
                location_type or "online",
                details
            )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return {"success": True, "interview_id": interview.id}


@router.post("/applications/{application_id}/interview/finalize")
async def finalize_interview(
    request: Request,
    application_id: int,
    data: Dict[str, Any],
    user = Depends(require_role(UserRole.INTERVIEWER)),
    db: Session = Depends(get_db)
):
    """Finalize technical interview (confirm location/link)"""
    interview_id = data.get("interview_id")
    location_type = data.get("location_type")
    details = data.get("details")

    # If interview_id is 0 or missing, try to find the latest TECHNICAL interview for this app
    if not interview_id or interview_id == 0:
        found_interview = db.query(Interview).filter(
            Interview.application_id == application_id,
            Interview.interview_type == InterviewType.TECHNICAL,
            Interview.is_confirmed == False
        ).order_by(Interview.created_at.desc()).first()
        
        if not found_interview:
             raise HTTPException(status_code=404, detail="No active technical interview found to finalize")
        interview_id = found_interview.id
    
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
                "technical",
                datetime_str,
                location_type,
                details or {}
            )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    return {"success": True}

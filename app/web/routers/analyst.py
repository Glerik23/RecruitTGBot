from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.analytics_service import AnalyticsService
from app.web.dependencies import require_role
from app.models.user import UserRole

router = APIRouter(prefix="/analyst", tags=["analyst"])

@router.get("/dashboard")
async def get_analytics(
    user = Depends(require_role(UserRole.ANALYST, UserRole.DIRECTOR)),
    db: Session = Depends(get_db)
):
    """Get full analytics dashboard data"""
    
    analytics = AnalyticsService.get_full_analytics(db)
    return analytics

from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
import os

router = APIRouter(tags=["general"])

# Static files directory helper
def get_static_dir():
    # Assuming this file is in app/web/routers/
    # We need to go up to app/web/static
    current_dir = os.path.dirname(os.path.abspath(__file__))
    # up to app/web -> app/web/static
    static_dir = os.path.join(os.path.dirname(current_dir), "static")
    return static_dir

@router.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}

@router.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "RecruitTG API",
        "version": "1.0.0",
        "status": "running"
    }

# SPA Routes - Serve index.html for all frontend routes
@router.get("/candidate/application", response_class=FileResponse)
async def candidate_application_page():
    return FileResponse(os.path.join(get_static_dir(), "index.html"))

@router.get("/candidate/applications", response_class=FileResponse)
async def candidate_applications_page():
    return FileResponse(os.path.join(get_static_dir(), "index.html"))

@router.get("/hr/applications", response_class=FileResponse)
async def hr_applications_page():
    return FileResponse(os.path.join(get_static_dir(), "index.html"))

@router.get("/analyst/dashboard", response_class=FileResponse)
async def analyst_dashboard_page():
    return FileResponse(os.path.join(get_static_dir(), "index.html"))

@router.get("/director/roles", response_class=FileResponse)
async def director_roles_page():
    return FileResponse(os.path.join(get_static_dir(), "index.html"))

@router.get("/waiting", response_class=FileResponse)
async def waiting_page():
    return FileResponse(os.path.join(get_static_dir(), "index.html"))

@router.get("/history", response_class=FileResponse)
async def history_page():
    return FileResponse(os.path.join(get_static_dir(), "index.html"))

@router.get("/interviewer/dashboard", response_class=FileResponse)
async def interviewer_dashboard_page():
    return FileResponse(os.path.join(get_static_dir(), "index.html"))

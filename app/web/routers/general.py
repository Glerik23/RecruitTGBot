from fastapi import APIRouter, Depends
from app.web.dependencies import get_user_from_request
from fastapi.responses import FileResponse
import os

api_router = APIRouter(tags=["general"])
spa_router = APIRouter(tags=["spa"])

# Static files directory helper
def get_static_dir():
    # Assuming this file is in app/web/routers/
    # We need to go up to app/web/static
    current_dir = os.path.dirname(os.path.abspath(__file__))
    # up to app/web -> app/web/static
    static_dir = os.path.join(os.path.dirname(current_dir), "static")
    return static_dir

@api_router.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}

@api_router.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "RecruitTG API",
        "version": "1.0.0",
        "status": "running"
    }

@api_router.get("/me")
async def get_current_user_profile(
    user = Depends(get_user_from_request)
):
    """Отримати профіль поточного користувача з роллю"""
    return {
        "id": user.id,
        "telegram_id": user.telegram_id,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user.role.value
    }

# SPA Routes - Serve index.html for all frontend routes
@spa_router.get("/candidate/application", response_class=FileResponse)
async def candidate_application_page():
    return FileResponse(os.path.join(get_static_dir(), "index.html"))

@spa_router.get("/candidate/applications", response_class=FileResponse)
async def candidate_applications_page():
    return FileResponse(os.path.join(get_static_dir(), "index.html"))

@spa_router.get("/hr/applications", response_class=FileResponse)
async def hr_applications_page():
    return FileResponse(os.path.join(get_static_dir(), "index.html"))

@spa_router.get("/analyst/dashboard", response_class=FileResponse)
async def analyst_dashboard_page():
    return FileResponse(os.path.join(get_static_dir(), "index.html"))

@spa_router.get("/director/roles", response_class=FileResponse)
async def director_roles_page():
    return FileResponse(os.path.join(get_static_dir(), "index.html"))

@spa_router.get("/waiting", response_class=FileResponse)
async def waiting_page():
    return FileResponse(os.path.join(get_static_dir(), "index.html"))

@spa_router.get("/history", response_class=FileResponse)
async def history_page():
    return FileResponse(os.path.join(get_static_dir(), "index.html"))

@spa_router.get("/interviewer/dashboard", response_class=FileResponse)
async def interviewer_dashboard_page():
    return FileResponse(os.path.join(get_static_dir(), "index.html"))

@spa_router.get("/interviewer/application/{path:path}", response_class=FileResponse)
async def interviewer_application_detail_page(path: str):
    return FileResponse(os.path.join(get_static_dir(), "index.html"))

# Catch-all for other React routes
@spa_router.get("/{full_path:path}", response_class=FileResponse)
async def catch_all(full_path: str):
    # Only serve index.html if it doesn't look like an API call (optional check)
    if full_path.startswith("api/") or full_path.startswith("web/"):
        return None # Let other routers handle it
    
    # Check if file exists in static first? 
    # FastAPI's StaticFiles mount /static should handle assets.
    # This catch-all is only for top-level navigation routes.
    
    index_path = os.path.join(get_static_dir(), "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Not found", "path": full_path}

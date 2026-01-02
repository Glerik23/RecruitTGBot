"""Main application entry point"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import settings
from app.database import init_db
# Import new routers
from app.web.routers import candidate_router, hr_router, analyst_router, director_router, interviewer_router
from app.web.routers.general import api_router, spa_router
from app.bot.bot import create_bot_application
from app.utils.ngrok import setup_ngrok, close_ngrok
from contextlib import asynccontextmanager
import os


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Initialization
    init_db()
    
    # Ngrok setup (if needed)
    ngrok_url = None
    if settings.ENVIRONMENT == "development" and settings.NGROK_AUTH_TOKEN:
        try:
            ngrok_url = setup_ngrok(8000)
            print(f"🌐 Ngrok URL: {ngrok_url}")
            if not settings.WEB_APP_URL:
                settings.WEB_APP_URL = ngrok_url
        except Exception as e:
            print(f"⚠️ Ngrok setup error: {e}")
    
    # Start Bot
    bot_app = create_bot_application()
    
    # Store get_db for bot usage
    from app.database import get_db
    bot_app.bot_data["get_db"] = get_db
    
    await bot_app.initialize()
    await bot_app.start()
    await bot_app.updater.start_polling()
    
    # Store bot_app in app state for access in routers
    app.state.bot_app = bot_app
    
    yield
    
    # Cleanup
    if ngrok_url:
        close_ngrok()
    await bot_app.updater.stop()
    await bot_app.stop()
    await bot_app.shutdown()


app = FastAPI(
    title="RecruitTG API",
    description="API for Recruitment System via Telegram",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static Files
static_dir = os.path.join(os.path.dirname(__file__), "app", "web", "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Include Routers
# Prefix for API routes
app.include_router(candidate_router, prefix="/web")
app.include_router(hr_router, prefix="/web")
app.include_router(analyst_router, prefix="/web")
app.include_router(director_router, prefix="/web")
app.include_router(interviewer_router, prefix="/web")
# General API routes (me, health)
app.include_router(api_router, prefix="/web")
# SPA routes (serving index.html) - keep at the end
app.include_router(spa_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


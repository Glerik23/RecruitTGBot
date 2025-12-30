from telegram import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from sqlalchemy.orm import Session
from app.models.user import User
from app.services.interviewer_service import InterviewerService
from app.config import settings

async def show_interviewer_assignments(query, db: Session, user: User):
    """Show assignments for Interviewer"""
    applications = InterviewerService.get_assigned_applications(db, user.id)
    count = len(applications)
    
    text = f"💻 Панель інтерв'юера\n\n"
    text += f"Призначено кандидатів: <b>{count}</b>\n\n"
    text += "Використовуйте веб-додаток для проведення співбесіди та оцінки."
    
    keyboard = [[
        InlineKeyboardButton(
            "💻 Відкрити панель",
            web_app=WebAppInfo(url=f"{(settings.WEB_APP_URL or 'http://localhost:8000')}/interviewer/dashboard")
        )
    ], [
        InlineKeyboardButton("🔙 Назад", callback_data="back_menu")
    ]]
    
    await query.edit_message_text(
        text,
        reply_markup=InlineKeyboardMarkup(keyboard),
        parse_mode="HTML"
    )

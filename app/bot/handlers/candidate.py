from telegram import InlineKeyboardButton, InlineKeyboardMarkup
from sqlalchemy.orm import Session
from app.models.user import User
from app.services.application_service import ApplicationService

async def show_my_applications(query, db: Session, user: User):
    """Показати заявки кандидата"""
    applications = ApplicationService.get_user_applications(db, user.id)
    
    if not applications:
        await query.edit_message_text(
            "📋 У вас поки немає заявок.\n\n"
            "Створіть нову заявку через меню.",
            reply_markup=InlineKeyboardMarkup([[
                InlineKeyboardButton("🔙 Назад", callback_data="back_menu")
            ]])
        )
        return
    
    text = "📋 Ваші заявки:\n\n"
    keyboard = []
    
    for app in applications[:10]:  # Показуємо перші 10
        status_emoji = {
            "pending": "⏳",
            "reviewed": "👀",
            "rejected": "❌",
            "accepted": "✅",
            "interview_scheduled": "📅",
            "hired": "🎉"
        }.get(app.status, "📄")
        
        text += f"{status_emoji} {app.position} - {app.status}\n"
        keyboard.append([InlineKeyboardButton(
            f"Деталі: {app.position}",
            callback_data=f"app_detail_{app.id}"
        )])
    
    keyboard.append([InlineKeyboardButton("🔙 Назад", callback_data="back_menu")])
    
    await query.edit_message_text(
        text,
        reply_markup=InlineKeyboardMarkup(keyboard)
    )

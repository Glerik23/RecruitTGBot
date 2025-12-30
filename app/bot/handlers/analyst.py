from telegram import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from sqlalchemy.orm import Session
from app.models.user import User, UserRole
from app.services.analytics_service import AnalyticsService
from app.config import settings

async def show_analytics(query, db: Session, user: User):
    """Показати аналітику"""
    if user.role not in [UserRole.ANALYST, UserRole.DIRECTOR]:
        await query.answer("❌ Доступ заборонено")
        return
    
    analytics = AnalyticsService.get_full_analytics(db)
    overview = analytics["overview"]
    
    text = "📊 <b>Аналітика компанії</b>\n\n"
    text += f"📈 <b>Коротка статистика:</b>\n"
    text += f"• Всього заявок: <b>{overview['total_applications']}</b>\n"
    text += f"• Очікують: {overview['pending']}\n"
    text += f"• Прийнято: {overview['accepted']}\n"
    text += f"• Відхилено: {overview['rejected']}\n"
    text += f"• Прийнято на роботу: {overview['hired']}\n"
    text += f"• Собесідувань: {analytics['interviews']['total_interviews']}\n\n"
    text += "Відкрийте miniapp для детальної аналітики з графіками та всіма метриками."
    
    keyboard = [[
        InlineKeyboardButton(
            "📊 Відкрити аналітику",
            web_app=WebAppInfo(url=f"{(settings.WEB_APP_URL or 'http://localhost:8000')}/analyst/dashboard")
        )
    ], [
        InlineKeyboardButton("🔙 Назад", callback_data="back_menu")
    ]]
    
    await query.edit_message_text(
        text,
        reply_markup=InlineKeyboardMarkup(keyboard),
        parse_mode="HTML"
    )

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import ContextTypes
from sqlalchemy.orm import Session
from app.models.user import User
from app.services.application_service import ApplicationService
from app.services.analytics_service import AnalyticsService
from app.config import settings

async def show_hr_applications(query, db: Session, user: User):
    """Показати заявки для HR (тепер через miniapp)"""
    applications = ApplicationService.get_pending_applications(db)
    count = len(applications)
    
    text = f"📋 Заявки на розгляд\n\n"
    text += f"Очікують розгляду: <b>{count}</b>\n\n"
    text += "Відкрийте miniapp для перегляду та обробки заявок."
    
    keyboard = [[
        InlineKeyboardButton(
            "📋 Відкрити заявки",
            web_app=WebAppInfo(url=f"{(settings.WEB_APP_URL or 'http://localhost:8000')}/hr/applications")
        )
    ], [
        InlineKeyboardButton("🔙 Назад", callback_data="back_menu")
    ]]
    
    await query.edit_message_text(
        text,
        reply_markup=InlineKeyboardMarkup(keyboard),
        parse_mode="HTML"
    )

async def handle_application_action(query, db: Session, user: User, context: ContextTypes.DEFAULT_TYPE):
    """Обробка дій з заявками"""
    parts = query.data.split("_")
    
    if len(parts) < 3:
        return
    
    action = parts[1]
    app_id = int(parts[2])
    
    application = ApplicationService.get_application(db, app_id)
    if not application:
        await query.answer("❌ Заявка не знайдена")
        return
    
    if action == "accept":
        ApplicationService.accept_application(db, app_id, user.id)
        await query.answer("✅ Заявку прийнято")
        await query.edit_message_text(
            f"✅ Заявку від {application.full_name} прийнято.\n\n"
            "Тепер потрібно запланувати собесідування через веб-інтерфейс.",
            reply_markup=InlineKeyboardMarkup([[
                InlineKeyboardButton("🔙 Назад", callback_data="hr_applications")
            ]])
        )
        
        # Відправляємо повідомлення кандидату
        try:
            await context.bot.send_message(
                application.candidate.telegram_id,
                f"✅ Вашу заявку на позицію {application.position} прийнято!\n\n"
                "Очікуйте інформацію про планування собесідування."
            )
        except:
            pass
    
    elif action == "reject":
        # Запитуємо причину відхилення
        await query.edit_message_text(
            f"❌ Відхилення заявки від {application.full_name}\n\n"
            "Введіть причину відхилення:",
            reply_markup=InlineKeyboardMarkup([[
                InlineKeyboardButton("🔙 Скасувати", callback_data="hr_applications")
            ]])
        )
        # Зберігаємо стан для обробки наступного повідомлення
        context.user_data["rejecting_app_id"] = app_id


async def show_hr_stats(query, db: Session, user: User):
    """Показати статистику HR"""
    applications = ApplicationService.get_hr_applications(db, user.id)
    stats = AnalyticsService.get_overview_stats(db)
    
    text = "📊 Ваша статистика:\n\n"
    text += f"• Розглянуто заявок: {len(applications)}\n"
    text += f"• Всього заявок в системі: {stats['total_applications']}\n"
    text += f"• Очікують розгляду: {stats['pending']}\n"
    
    await query.edit_message_text(
        text,
        reply_markup=InlineKeyboardMarkup([[
            InlineKeyboardButton("🔙 Назад", callback_data="back_menu")
        ]])
    )

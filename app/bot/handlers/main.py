from telegram import Update
from telegram.ext import ContextTypes
from sqlalchemy.orm import Session
from app.models.user import User, UserRole
from app.services.user_service import UserService
from app.services.application_service import ApplicationService
from app.bot.utils import get_db_from_context, get_user_from_update, build_main_menu_keyboard, format_user_greeting
from app.config import settings
from app.utils.helpers import get_role_emoji

# Import role handlers
from app.bot.handlers.candidate import show_my_applications
from app.bot.handlers.hr import show_hr_applications, show_hr_stats, handle_application_action
from app.bot.handlers.analyst import show_analytics
from app.bot.handlers.director import show_manage_roles, handle_invite_action, show_invite_list, handle_invite_delete
from app.bot.handlers.interviewer import show_interviewer_assignments

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обробка команди /start"""
    db = get_db_from_context(context)
    user_data = update.effective_user
    
    # Перевірка на запрошувальне посилання
    if context.args:
        token = context.args[0]
        user = UserService.get_or_create_user(
            db,
            user_data.id,
            user_data.username,
            user_data.first_name,
            user_data.last_name
        )
        
        invite = UserService.use_invite_link(db, token, user.id)
        if invite:
            role_emoji = get_role_emoji(invite.role)
            keyboard = build_main_menu_keyboard(user)
            await update.message.reply_text(
                f"✅ Роль призначено: {role_emoji} {invite.role.value.capitalize()}",
                reply_markup=keyboard,
                parse_mode="HTML"
            )
        else:
            await update.message.reply_text("❌ Посилання недійсне або вже використане")
        return
    
    # Звичайний старт
    user = UserService.get_or_create_user(
        db,
        user_data.id,
        user_data.username,
        user_data.first_name,
        user_data.last_name
    )
    
    # Автоматичне призначення ролі директора
    if settings.AUTO_ASSIGN_DIRECTOR:
        director_id = settings.get_director_id()
        if director_id and user_data.id == director_id:
            if user.role != UserRole.DIRECTOR:
                user.role = UserRole.DIRECTOR
                db.commit()
                db.refresh(user)
    
    keyboard = build_main_menu_keyboard(user)
    
    await update.message.reply_text(
        format_user_greeting(user),
        reply_markup=keyboard,
        parse_mode="HTML"
    )

async def callback_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обробка callback-запитів"""
    query = update.callback_query
    await query.answer()
    
    db = get_db_from_context(context)
    user = get_user_from_update(update, db)
    
    if not user:
        await query.edit_message_text(Messages.USER_NOT_FOUND)
        return
    
    if query.data == "my_applications":
        await show_my_applications(query, db, user)
    elif query.data == "hr_applications":
        await show_hr_applications(query, db, user)
    elif query.data == "hr_stats":
        await show_hr_stats(query, db, user)
    elif query.data == "analytics":
        await show_analytics(query, db, user)
    elif query.data == "manage_roles":
        await show_manage_roles(query, db, user)
    elif query.data.startswith("app_"):
        await handle_application_action(query, db, user, context)
    elif query.data == "invite_list":
        await show_invite_list(query, db, user, context)
    elif query.data.startswith("invite_delete_"):
        await handle_invite_delete(query, db, user, context)
    elif query.data.startswith("invite_"):
        await handle_invite_action(query, db, user, context)
    elif query.data == "interviewer_assignments":
        await show_interviewer_assignments(query, db, user)
    elif query.data == "back_menu":
        await back_to_menu(query, db, user)

async def back_to_menu(query, db: Session, user: User):
    """Повернутися до головного меню"""
    keyboard = build_main_menu_keyboard(user)
    
    await query.edit_message_text(
        format_user_greeting(user),
        reply_markup=keyboard,
        parse_mode="HTML"
    )

async def handle_text_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обробка текстових повідомлень"""
    # Отримуємо БД через генератор
    get_db_func = context.bot_data.get("get_db")
    if get_db_func:
        db_gen = get_db_func()
        db = next(db_gen)
    else:
        from app.database import SessionLocal
        db = SessionLocal()
    
    user = UserService.get_user_by_telegram_id(db, update.effective_user.id)
    
    # Перевірка чи очікується причина відхилення
    if "rejecting_app_id" in context.user_data:
        app_id = context.user_data["rejecting_app_id"]
        reason = update.message.text
        
        application = ApplicationService.reject_application(db, app_id, user.id, reason)
        if application:
            await update.message.reply_text(
                f"✅ Заявку відхилено.\nПричина: {reason}"
            )
            
            # Відправляємо повідомлення кандидату
            try:
                await context.bot.send_message(
                    application.candidate.telegram_id,
                    f"❌ Вашу заявку на позицію {application.position} відхилено.\n\n"
                    f"Причина: {reason}"
                )
            except:
                pass
        
        del context.user_data["rejecting_app_id"]
        return
    
    await update.message.reply_text("Натисніть /start")

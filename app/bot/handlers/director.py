from telegram import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import ContextTypes
from sqlalchemy.orm import Session
from app.models.user import User, UserRole
from app.services.user_service import UserService
from app.config import settings
from datetime import datetime, timezone

async def show_manage_roles(query, db: Session, user: User):
    """Управління ролями (для директора)"""
    if user.role != UserRole.DIRECTOR:
        await query.answer("❌ Доступ заборонено")
        return
    
    text = "👥 Управління ролями\n\n"
    text += "Оберіть дію:"
    
    keyboard = [
        [InlineKeyboardButton("➕ Створити запрошення HR", callback_data="invite_create_hr")],
        [InlineKeyboardButton("➕ Створити запрошення Аналітик", callback_data="invite_create_analyst")],
        [InlineKeyboardButton("➕ Створити запрошення Директор", callback_data="invite_create_director")],
        [InlineKeyboardButton("📋 Переглянути запрошення", callback_data="invite_list")],
        [InlineKeyboardButton("🔙 Назад", callback_data="back_menu")]
    ]
    
    await query.edit_message_text(
        text,
        reply_markup=InlineKeyboardMarkup(keyboard)
    )

async def handle_invite_action(query, db: Session, user: User, context: ContextTypes.DEFAULT_TYPE):
    """Обробка створення запрошень"""
    if user.role != UserRole.DIRECTOR:
        await query.answer("❌ Доступ заборонено")
        return
    
    parts = query.data.split("_")
    if len(parts) < 3:
        await query.answer("❌ Невірний формат запиту")
        return
    
    # Формат: invite_create_hr -> parts = ["invite", "create", "hr"]
    role_name = parts[2]
    role_map = {
        "hr": UserRole.HR,
        "analyst": UserRole.ANALYST,
        "director": UserRole.DIRECTOR
    }
    
    role = role_map.get(role_name)
    if not role:
        await query.answer("❌ Невірна роль")
        return
    
    invite = UserService.create_invite_link(db, role, user.id)
    bot_username = context.bot.username or "your_bot"
    invite_url = f"https://t.me/{bot_username}?start={invite.token}"
    
    await query.edit_message_text(
        f"✅ Запрошення створено!\n\n"
        f"Роль: <b>{role.value}</b>\n\n"
        f"Посилання:\n<code>{invite_url}</code>\n\n"
        "Посилання дійсне 24 години.",
        reply_markup=InlineKeyboardMarkup([
            [InlineKeyboardButton("📋 Всі запрошення", callback_data="invite_list")],
            [InlineKeyboardButton("🔙 Назад", callback_data="manage_roles")]
        ]),
        parse_mode="HTML"
    )

async def show_invite_list(query, db: Session, user: User, context: ContextTypes.DEFAULT_TYPE):
    """Показати список запрошувальних посилань"""
    if user.role != UserRole.DIRECTOR:
        await query.answer("❌ Доступ заборонено")
        return
    
    invites = UserService.get_all_invites(db, user.id)
    
    if not invites:
        await query.edit_message_text(
            "📋 Запрошувальні посилання\n\n"
            "У вас поки немає створених запрошень.\n\n"
            "Створіть нове запрошення через меню.",
            reply_markup=InlineKeyboardMarkup([[
                InlineKeyboardButton("🔙 Назад", callback_data="manage_roles")
            ]])
        )
        return
    
    # Группируем по статусу
    active_invites = [inv for inv in invites if not inv.is_used]
    used_invites = [inv for inv in invites if inv.is_used]
    
    text = "📋 Запрошувальні посилання\n\n"
    
    if active_invites:
        text += f"🟢 Активні ({len(active_invites)}):\n\n"
        for invite in active_invites[:10]:  # Показуємо перші 10
            role_emoji = {
                "hr": "👔",
                "analyst": "📊",
                "director": "👑",
                "candidate": "👤"
            }.get(invite.role.value, "📌")
            
            expires_text = ""
            if invite.expires_at:
                expires_at = invite.expires_at
                now = datetime.now(timezone.utc) if expires_at.tzinfo else datetime.utcnow()
                # Приводим к одному формату
                if expires_at.tzinfo and not now.tzinfo:
                    now = now.replace(tzinfo=timezone.utc)
                elif not expires_at.tzinfo and now.tzinfo:
                    expires_at = expires_at.replace(tzinfo=timezone.utc)
                
                if expires_at > now:
                    hours_left = (expires_at - now).total_seconds() / 3600
                    expires_text = f" (залишилось ~{int(hours_left)} год.)"
                else:
                    expires_text = " (термін минув)"
            
            bot_username = context.bot.username or "your_bot"
            invite_url = f"https://t.me/{bot_username}?start={invite.token}"
            
            text += f"{role_emoji} <b>{invite.role.value.upper()}</b>\n"
            text += f"<code>{invite_url}</code>{expires_text}\n\n"
    
    if used_invites:
        text += f"\n🔴 Використані ({len(used_invites)}):\n\n"
        for invite in used_invites[:5]:  # Показуємо перші 5 використаних
            role_emoji = {
                "hr": "👔",
                "analyst": "📊",
                "director": "👑",
                "candidate": "👤"
            }.get(invite.role.value, "📌")
            
            used_date = invite.used_at.strftime("%d.%m.%Y %H:%M") if invite.used_at else "Невідомо"
            text += f"{role_emoji} {invite.role.value.upper()} - використано {used_date}\n"
    
    keyboard = []
    
    # Кнопки для видалення активних запрошень
    for invite in active_invites[:5]:
        role_emoji = {
            "hr": "👔",
            "analyst": "📊",
            "director": "👑",
            "candidate": "👤"
        }.get(invite.role.value, "📌")
        
        keyboard.append([InlineKeyboardButton(
            f"🗑️ Видалити {role_emoji} {invite.role.value.upper()}",
            callback_data=f"invite_delete_{invite.id}"
        )])
    
    keyboard.append([InlineKeyboardButton("🔙 Назад", callback_data="manage_roles")])
    
    await query.edit_message_text(
        text,
        reply_markup=InlineKeyboardMarkup(keyboard),
        parse_mode="HTML"
    )

async def handle_invite_delete(query, db: Session, user: User, context: ContextTypes.DEFAULT_TYPE):
    """Видалити запрошувальне посилання"""
    if user.role != UserRole.DIRECTOR:
        await query.answer("❌ Доступ заборонено")
        return
    
    parts = query.data.split("_")
    if len(parts) < 3:
        await query.answer("❌ Невірний формат запиту")
        return
    
    try:
        invite_id = int(parts[2])
    except ValueError:
        await query.answer("❌ Невірний ID запрошення")
        return
    
    success = UserService.delete_invite(db, invite_id, user.id)
    
    if success:
        await query.answer("✅ Запрошення видалено")
        # Показуємо оновлений список
        await show_invite_list(query, db, user, context)
    else:
        await query.answer("❌ Не вдалося видалити запрошення")

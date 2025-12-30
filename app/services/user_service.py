"""Сервіс для роботи з користувачами"""
from sqlalchemy.orm import Session
from app.models.user import User, UserRole, InviteLink
from app.services.base_service import BaseService
from app.utils.exceptions import UserNotFoundError, InviteInvalidError
from app.constants import InviteExpiry
from typing import Optional, List
from datetime import datetime, timedelta, timezone


class UserService(BaseService[User]):
    """Сервіс для управління користувачами"""
    
    @staticmethod
    def get_or_create_user(
        db: Session,
        telegram_id: int,
        username: Optional[str] = None,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None
    ) -> User:
        """Отримати або створити користувача"""
        user = db.query(User).filter(User.telegram_id == telegram_id).first()
        if not user:
            user = User(
                telegram_id=telegram_id,
                username=username,
                first_name=first_name,
                last_name=last_name,
                role=UserRole.CANDIDATE
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            # Оновлюємо дані, якщо змінилися
            if username and user.username != username:
                user.username = username
            if first_name and user.first_name != first_name:
                user.first_name = first_name
            if last_name and user.last_name != last_name:
                user.last_name = last_name
            db.commit()
            db.refresh(user)
        return user
    
    @staticmethod
    def get_user_by_telegram_id(db: Session, telegram_id: int) -> Optional[User]:
        """Отримати користувача за Telegram ID"""
        return db.query(User).filter(User.telegram_id == telegram_id).first()
    
    @staticmethod
    def assign_role(db: Session, user_id: int, role: UserRole) -> bool:
        """Призначити роль користувачу"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        user.role = role
        db.commit()
        return True
    
    @staticmethod
    def create_invite_link(
        db: Session,
        role: UserRole,
        created_by: Optional[int] = None,
        expires_in_hours: Optional[int] = InviteExpiry.DEFAULT_HOURS
    ) -> InviteLink:
        """Створити запрошувальне посилання"""
        token = InviteLink.generate_token()
        expires_at = None
        if expires_in_hours:
            expires_at = datetime.now(timezone.utc) + timedelta(hours=expires_in_hours)
        
        invite = InviteLink(
            token=token,
            role=role,
            created_by=created_by,
            expires_at=expires_at
        )
        db.add(invite)
        db.commit()
        db.refresh(invite)
        return invite
    
    @staticmethod
    def use_invite_link(db: Session, token: str, user_id: int) -> Optional[InviteLink]:
        """Використати запрошувальне посилання"""
        invite = db.query(InviteLink).filter(
            InviteLink.token == token,
            InviteLink.is_used == False
        ).first()
        
        if not invite:
            return None
        
        # Перевірка терміну дії
        now = datetime.now(timezone.utc)
        if invite.expires_at:
            expires_at = invite.expires_at
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at < now:
                return None
        
        # Використовуємо посилання
        invite.is_used = True
        invite.used_by = user_id
        invite.used_at = now
        
        # Призначаємо роль
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.role = invite.role
        
        db.commit()
        db.refresh(invite)
        return invite
    
    @staticmethod
    def get_users_by_role(db: Session, role: UserRole) -> List[User]:
        """Отримати користувачів за роллю"""
        return db.query(User).filter(User.role == role, User.is_active == True).all()
    
    @staticmethod
    def get_all_invites(db: Session, created_by: Optional[int] = None) -> List[InviteLink]:
        """Отримати всі запрошувальні посилання"""
        query = db.query(InviteLink)
        if created_by:
            query = query.filter(InviteLink.created_by == created_by)
        return query.order_by(InviteLink.created_at.desc()).all()
    
    @staticmethod
    def delete_invite(db: Session, invite_id: int, user_id: int) -> bool:
        """Видалити запрошувальне посилання (тільки якщо створено користувачем)"""
        invite = db.query(InviteLink).filter(InviteLink.id == invite_id).first()
        if not invite:
            return False
        
        # Перевірка прав (тільки створювач або директор може видалити)
        user = db.query(User).filter(User.id == user_id).first()
        if not user or user.role != UserRole.DIRECTOR:
            return False
        
        db.delete(invite)
        db.commit()
        return True


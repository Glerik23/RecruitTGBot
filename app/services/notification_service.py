"""Сервіс для відправки повідомлень через бота"""
import asyncio
from sqlalchemy.orm import Session
from typing import Optional
from fastapi import Request


class NotificationService:
    """Сервіс для централізованої відправки повідомлень"""
    
    @staticmethod
    async def send_message(request: Request, telegram_id: int, message: str) -> bool:
        """
        Відправити повідомлення користувачу через Telegram бота
        
        Args:
            request: FastAPI Request для доступу до bot_app
            telegram_id: Telegram ID користувача
            message: Текст повідомлення
            
        Returns:
            True якщо повідомлення відправлено успішно
        """
        try:
            if not hasattr(request.app.state, 'bot_app') or not request.app.state.bot_app:
                return False
                
            bot = request.app.state.bot_app.bot
            
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(bot.send_message(telegram_id, message, parse_mode="Markdown"))
            else:
                await bot.send_message(telegram_id, message, parse_mode="Markdown")
            
            return True
        except Exception as e:
            print(f"Error sending notification: {e}")
            return False
    
    @staticmethod
    async def notify_application_accepted(
        request: Request, 
        telegram_id: int, 
        position: str
    ) -> bool:
        """Повідомлення про прийняття заявки"""
        message = (
            f"✅ Вашу заявку на позицію **{position}** прийнято в роботу!\n\n"
            "Наші HR менеджери вже вивчають ваші дані. Найближчим часом ви отримаєте повідомлення про наступні кроки або пропозицію обрати час для співбесіди.\n\n"
            "Дякуємо за інтерес до нашої компанії! 🙌"
        )
        return await NotificationService.send_message(request, telegram_id, message)
    
    @staticmethod
    async def notify_application_rejected(
        request: Request, 
        telegram_id: int, 
        position: str, 
        reason: str
    ) -> bool:
        """Повідомлення про відхилення заявки"""
        message = (
            f"❌ На жаль, вашу заявку на позицію **{position}** відхилено.\n\n"
            f"**Причина:** {reason}\n\n"
            "Дякуємо за ваш час та бажаємо успіхів у пошуку нових можливостей! 🌱"
        )
        return await NotificationService.send_message(request, telegram_id, message)
    
    @staticmethod
    async def notify_interview_scheduled(
        request: Request,
        telegram_id: int,
        position: str,
        interview_type: str,
        datetime_str: str
    ) -> bool:
        """Повідомлення про заплановане собесідування"""
        type_name = "HR скрінінг" if interview_type == "hr_screening" else "Технічне інтерв'ю"
        location_text = "Онлайн 🌐" if location_type == "online" else "В офісі 🏢"
        message = (
            f"📅 {type_name} заплановано!\n\n"
            f"**Позиція:** {position}\n"
            f"**Час:** {datetime_str}\n"
            f"**Формат:** {location_text}\n\n"
            "Перейдіть у Mini App, щоб переглянути деталі або посилання на зустріч."
        )
        return await NotificationService.send_message(request, telegram_id, message)
    
    @staticmethod
    async def notify_slots_available(
        request: Request,
        telegram_id: int,
        position: str,
        interview_type: str,
        slots: list,
        location_type: str = "online",
        details: Optional[dict] = None
    ) -> bool:
        """Повідомлення про доступні слоти для вибору"""
        type_name = "HR скрінінг" if interview_type == "hr_screening" else "Технічне інтерв'ю"
        
        # Форматуємо слоти для відображення
        slots_text = ""
        for i, slot in enumerate(slots[:5], 1):  # Показуємо макс 5 слотів
            try:
                from datetime import datetime
                start = datetime.fromisoformat(slot['start'].replace('Z', '+00:00'))
                end = datetime.fromisoformat(slot['end'].replace('Z', '+00:00'))
                date_str = start.strftime("%d.%m.%Y")
                time_str = f"{start.strftime('%H:%M')} - {end.strftime('%H:%M')}"
                slots_text += f"  {i}. {date_str} | {time_str}\n"
            except:
                continue
        
        if len(slots) > 5:
            slots_text += f"  ... та ще {len(slots) - 5} варіантів\n"
        
        location_text = "Онлайн 🌐" if location_type == "online" else "В офісі 🏢"
        
        # Details about meeting
        details_text = ""
        if location_type == "online":
            link = details.get("meet_link") if details else None
            if link:
                details_text = f"**Посилання:** {link}\n"
            else:
                details_text = f"**Посилання:** посилання на онлайн співбесіду буде у вас найближчим часом ⏳\n"
        elif location_type == "office":
            address = details.get("address") if details else None
            if address:
                details_text = f"**Адреса:** {address}\n"

        message = (
            f"📋 Вам запропоновано обрати час для **{type_name.lower()}**!\n\n"
            f"**Позиція:** {position}\n"
            f"**Формат:** {location_text}\n"
            f"{details_text}\n"
            f"**Доступні варіанти:**\n{slots_text}\n"
            "Будь ласка, перейдіть у застосунок та оберіть зручний для вас слот. 🕒"
        )
        return await NotificationService.send_message(request, telegram_id, message)
    
    @staticmethod
    async def notify_interview_confirmed(
        request: Request,
        telegram_id: int,
        position: str,
        interview_type: str,
        datetime_str: str,
        location_type: str,
        details: dict
    ) -> bool:
        """Повідомлення про підтверджене собесідування з деталями"""
        type_name = "HR скрінінг" if interview_type == "hr_screening" else "Технічне інтерв'ю"
        
        location_info = ""
        if location_type == "online":
            meet_link = details.get("meet_link", "")
            if meet_link:
                location_info = f"📍 Формат: Онлайн\n🔗 Посилання: {meet_link}"
            else:
                location_info = "📍 Формат: Онлайн\n🔗 Посилання буде надіслано згодом"
        else:
            address = details.get("address", "")
            location_info = f"📍 Формат: В офісі\n🏢 Адреса: {address}"
        
        message = (
            f"✅ **{type_name} підтверджено!**\n\n"
            f"**Позиція:** {position}\n"
            f"**Дата та час:** {datetime_str}\n\n"
            f"{location_info}\n\n"
            "Ми будемо раді поспілкуватися з вами! Бажаємо успіху! 🍀"
        )
        return await NotificationService.send_message(request, telegram_id, message)

    @staticmethod
    async def notify_hr_new_application(
        request: Request,
        db: Session,
        candidate_name: str,
        position: str
    ) -> None:
        """Повідомити всіх HR про нову заявку"""
        from app.services.user_service import UserService
        from app.models.user import UserRole
        
        hrs = UserService.get_users_by_role(db, UserRole.HR)
        message = (
            f"🆕 **Нова заявка!**\n\n"
            f"👤 **Кандидат:** {candidate_name}\n"
            f"💼 **Позиція:** {position}\n\n"
            "Перегляньте деталі в HR панелі. 🔎"
        )
        for hr in hrs:
            if hr.telegram_id:
                await NotificationService.send_message(request, hr.telegram_id, message)

    @staticmethod
    async def notify_interviewer_assigned(
        request: Request,
        telegram_id: int,
        candidate_name: str,
        position: str
    ) -> bool:
        """Повідомити інтерв'юера про призначення на заявку"""
        message = (
            f"🧑‍💻 **Вам призначено нову заявку для тех. інтерв'ю!**\n\n"
            f"👤 **Кандидат:** {candidate_name}\n"
            f"💼 **Позиція:** {position}\n\n"
            "Будь ласка, перегляньте деталі та запропонуйте слоти для зустрічі в панелі інтерв'юера. 📅"
        )
        return await NotificationService.send_message(request, telegram_id, message)

    @staticmethod
    async def notify_staff_slot_selected(
        request: Request,
        telegram_id: int,
        candidate_name: str,
        position: str,
        datetime_str: str,
        interview_type: str
    ) -> bool:
        """Повідомити HR/Інтерв'юера про те, що кандидат обрав час"""
        type_name = "HR скрінінг" if interview_type == "hr_screening" else "Технічне інтерв'ю"
        message = (
            f"⌛ **Кандидат обрав час для {type_name.lower()}!**\n\n"
            f"👤 **Кандидат:** {candidate_name}\n"
            f"💼 **Позиція:** {position}\n"
            f"⏰ **Обраний час:** {datetime_str}\n\n"
            "Будь ласка, перейдіть у систему, щоб підтвердити зустріч та надіслати деталі. ✅"
        )
        return await NotificationService.send_message(request, telegram_id, message)
    @staticmethod
    async def notify_hr_application_claimed(
        request: Request,
        db: Session,
        hr_name: str,
        candidate_name: str,
        position: str
    ) -> None:
        """Повідомити всіх HR про те, що колега взяв заявку в роботу"""
        from app.services.user_service import UserService
        from app.models.user import UserRole
        
        hrs = UserService.get_users_by_role(db, UserRole.HR)
        message = (
            f"🤝 **Заявку взято в роботу!**\n\n"
            f"👤 **HR:** {hr_name}\n"
            f"👤 **Кандидат:** {candidate_name}\n"
            f"💼 **Позиція:** {position}\n\n"
            "Заявка тепер закріплена за цим менеджером. ✅"
        )
        for hr in hrs:
            if hr.telegram_id:
                await NotificationService.send_message(request, hr.telegram_id, message)

    @staticmethod
    async def notify_interviewer_claimed(
        request: Request,
        db: Session,
        interviewer_name: str,
        candidate_name: str,
        position: str
    ) -> None:
        """Повідомити всіх тех. спеціалістів про те, що колега взяв заявку з пулу"""
        from app.services.user_service import UserService
        from app.models.user import UserRole
        
        interviewers = UserService.get_users_by_role(db, UserRole.INTERVIEWER)
        message = (
            f"🧑‍💻 **Заявку взято з пулу!**\n\n"
            f"👤 **Експерт:** {interviewer_name}\n"
            f"👤 **Кандидат:** {candidate_name}\n"
            f"💼 **Позиція:** {position}\n\n"
            "Заявка успішно закріплена. Дякуємо! 🚀"
        )
        for interviewer in interviewers:
            if interviewer.telegram_id:
                await NotificationService.send_message(request, interviewer.telegram_id, message)

    @staticmethod
    async def notify_hr_feedback_submitted(
        request: Request,
        db: Session,
        application_id: int,
        candidate_name: str,
        position: str,
        interviewer_name: str,
        score: int
    ) -> None:
        """Повідомити HR про те, що тех. спеціаліст залишив фідбек"""
        from app.services.user_service import UserService
        from app.models.user import UserRole
        from app.models.application import Application
        
        app = db.query(Application).get(application_id)
        hrs_to_notify = []
        
        if app and app.hr and app.hr.telegram_id:
            hrs_to_notify = [app.hr]
        else:
            hrs_to_notify = UserService.get_users_by_role(db, UserRole.HR)
            
        score_icon = "🟢" if score >= 8 else "🟡" if score >= 5 else "🔴"
        
        message = (
            f"📝 **Новий тех-фідбек!**\n\n"
            f"👤 **Кандидат:** {candidate_name}\n"
            f"💼 **Позиція:** {position}\n"
            f"👨‍💻 **Інтерв'юер:** {interviewer_name}\n"
            f"{score_icon} **Оцінка:** {score}/10\n\n"
            "Перегляньте деталі та прийміть фінальне рішення в HR панелі. ⚖️"
        )
        
        for hr in hrs_to_notify:
            if hr.telegram_id:
                await NotificationService.send_message(request, hr.telegram_id, message)

    @staticmethod
    async def notify_candidate_result(
        request: Request,
        telegram_id: int,
        position: str,
        result: str,
        reason: Optional[str] = None
    ) -> bool:
        """Повідомлення кандидата про фінальний результат (Hire/Reject)"""
        if result == "hired":
            message = (
                f"🎉 **Вітаємо!** Ми раді повідомити, що ви успішно пройшли всі етапи відбору на позицію **{position}**!\n\n"
                "Найближчим часом наш HR менеджер зв'яжеться з вами для обговорення деталей оферу та наступних кроків. 🤝\n\n"
                "Ласкаво просимо до нашої команди! 🚀"
            )
        else:
            reason_text = f"**Причина:** {reason}\n\n" if reason else ""
            message = (
                f"⚖️ **Результат розгляду вашої кандидатури**\n\n"
                f"Дякуємо за ваш інтерес до позиції **{position}** та за час, приділений співбесідам.\n\n"
                f"На жаль, на даний момент ми не готові запропонувати вам роботу. {reason_text}"
                "Ми збережемо ваші контакти та зв'яжемося, якщо у нас з'являться вакансії, що більше відповідають вашому профілю. 🙌\n\n"
                "Бажаємо успіхів у професійному розвитку!"
            )
        
        return await NotificationService.send_message(request, telegram_id, message)

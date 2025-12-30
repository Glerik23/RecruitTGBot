"""Сервіс для відправки повідомлень через бота"""
import asyncio
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
                asyncio.create_task(bot.send_message(telegram_id, message))
            else:
                await bot.send_message(telegram_id, message)
            
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
            f"✅ Вашу заявку на позицію {position} прийнято!\n\n"
            "Очікуйте інформацію про планування собесідування."
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
            f"❌ Вашу заявку на позицію {position} відхилено.\n\n"
            f"Причина: {reason}"
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
        message = (
            f"📅 {type_name} заплановано!\n\n"
            f"Позиція: {position}\n"
            f"Дата та час: {datetime_str}\n\n"
            "Очікуйте деталі зустрічі."
        )
        return await NotificationService.send_message(request, telegram_id, message)
    
    @staticmethod
    async def notify_slots_available(
        request: Request,
        telegram_id: int,
        position: str,
        interview_type: str,
        slots: list
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
        
        message = (
            f"📋 Вам запропоновано час для {type_name.lower()}!\n\n"
            f"Позиція: {position}\n\n"
            f"Доступні варіанти:\n{slots_text}\n"
            "Перейдіть у застосунок, щоб обрати зручний час."
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
            location_info = f"📍 Формат: Онлайн\n🔗 Посилання: {meet_link}"
        else:
            address = details.get("address", "")
            location_info = f"📍 Формат: В офісі\n🏢 Адреса: {address}"
        
        message = (
            f"✅ {type_name} підтверджено!\n\n"
            f"Позиція: {position}\n"
            f"Дата та час: {datetime_str}\n\n"
            f"{location_info}\n\n"
            "Бажаємо успіху! 🍀"
        )
        return await NotificationService.send_message(request, telegram_id, message)


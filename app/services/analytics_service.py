"""Сервіс аналітики"""
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from app.models.application import Application, ApplicationStatus
from app.models.interview import Interview, InterviewType
from app.models.user import User, UserRole
from typing import Dict, Any, List
from datetime import datetime, timedelta
import json
import re
from collections import Counter


class AnalyticsService:
    """Сервіс для аналітики та статистики"""
    
    @staticmethod
    def get_overview_stats(db: Session) -> Dict[str, Any]:
        """Загальна статистика"""
        total_applications = db.query(func.count(Application.id)).scalar()
        pending = db.query(func.count(Application.id)).filter(
            Application.status == ApplicationStatus.PENDING.value
        ).scalar()
        accepted = db.query(func.count(Application.id)).filter(
            Application.status == ApplicationStatus.ACCEPTED.value
        ).scalar()
        rejected = db.query(func.count(Application.id)).filter(
            Application.status == ApplicationStatus.REJECTED.value
        ).scalar()
        interviews_scheduled = db.query(func.count(Interview.id)).filter(
            Interview.is_confirmed == True
        ).scalar()
        hired = db.query(func.count(Application.id)).filter(
            Application.status == ApplicationStatus.HIRED.value
        ).scalar()
        cancelled = db.query(func.count(Application.id)).filter(
            Application.status == ApplicationStatus.CANCELLED.value
        ).scalar()
        
        return {
            "total_applications": total_applications or 0,
            "pending": pending or 0,
            "accepted": accepted or 0,
            "rejected": rejected or 0,
            "interviews_scheduled": interviews_scheduled or 0,
            "hired": hired or 0,
            "cancelled": cancelled or 0,
            "rejection_rate": round((rejected / total_applications * 100) if total_applications > 0 else 0, 2),
            "acceptance_rate": round((accepted / total_applications * 100) if total_applications > 0 else 0, 2),
            "hiring_rate": round((hired / total_applications * 100) if total_applications > 0 else 0, 2),
            "cancellation_rate": round((cancelled / total_applications * 100) if total_applications > 0 else 0, 2)
        }
    
    @staticmethod
    def get_applications_by_period(db: Session, days: int = 30) -> Dict[str, Any]:
        """Статистика заявок за період"""
        start_date = datetime.utcnow() - timedelta(days=days)
        
        applications = db.query(
            func.date(Application.created_at).label('date'),
            func.count(Application.id).label('count')
        ).filter(
            Application.created_at >= start_date
        ).group_by(func.date(Application.created_at)).all()
        
        return {
            "period_days": days,
            "applications_by_date": [
                {"date": str(app.date), "count": app.count}
                for app in applications
            ]
        }
    
    @staticmethod
    def get_applications_by_status(db: Session) -> Dict[str, int]:
        """Розподіл заявок за статусами"""
        statuses = db.query(
            Application.status,
            func.count(Application.id).label('count')
        ).group_by(Application.status).all()
        
        return {status: count for status, count in statuses}
    
    @staticmethod
    def get_applications_by_position(db: Session) -> Dict[str, int]:
        """Розподіл заявок за позиціями"""
        positions = db.query(
            Application.position,
            func.count(Application.id).label('count')
        ).group_by(Application.position).all()
        
        return {position: count for position, count in positions}
    
    @staticmethod
    def get_interview_statistics(db: Session) -> Dict[str, Any]:
        """Статистика собесідувань"""
        from app.models.interview import LocationType
        
        total = db.query(func.count(Interview.id)).scalar()
        confirmed = db.query(func.count(Interview.id)).filter(
            Interview.is_confirmed == True
        ).scalar()
        
        # Рахуємо за типами інтерв'ю
        hr_screening = db.query(func.count(Interview.id)).filter(
            Interview.interview_type == InterviewType.HR_SCREENING
        ).scalar()
        technical = db.query(func.count(Interview.id)).filter(
            Interview.interview_type == InterviewType.TECHNICAL
        ).scalar()
        
        # Рахуємо за типами локації
        online = db.query(func.count(Interview.id)).filter(
            Interview.location_type == LocationType.ONLINE
        ).scalar()
        office = db.query(func.count(Interview.id)).filter(
            Interview.location_type == LocationType.OFFICE
        ).scalar()
        
        return {
            "total_interviews": total or 0,
            "confirmed": confirmed or 0,
            "pending_confirmation": (total or 0) - (confirmed or 0),
            "hr_screening": hr_screening or 0,
            "technical": technical or 0,
            "online": online or 0,
            "office": office or 0,
            "confirmation_rate": round((confirmed / total * 100) if total > 0 else 0, 2)
        }
    
    @staticmethod
    def get_hr_performance(db: Session) -> List[Dict[str, Any]]:
        """Продуктивність HR менеджерів"""
        hr_users = db.query(User).filter(User.role == UserRole.HR).all()
        
        performance = []
        for hr in hr_users:
            reviewed = db.query(func.count(Application.id)).filter(
                Application.hr_id == hr.id
            ).scalar()
            accepted = db.query(func.count(Application.id)).filter(
                Application.hr_id == hr.id,
                Application.status == ApplicationStatus.ACCEPTED.value
            ).scalar()
            rejected = db.query(func.count(Application.id)).filter(
                Application.hr_id == hr.id,
                Application.status == ApplicationStatus.REJECTED.value
            ).scalar()
            
            performance.append({
                "hr_id": hr.id,
                "hr_name": f"{hr.first_name} {hr.last_name}" if hr.first_name else hr.username or "Невідомо",
                "reviewed": reviewed or 0,
                "accepted": accepted or 0,
                "rejected": rejected or 0,
                "acceptance_rate": round((accepted / reviewed * 100) if reviewed > 0 else 0, 2)
            })
        
        return performance
    
    @staticmethod
    def get_time_to_review(db: Session) -> Dict[str, Any]:
        """Середній час розгляду заявок"""
        reviewed_apps = db.query(Application).filter(
            Application.reviewed_at.isnot(None)
        ).all()
        
        if not reviewed_apps:
            return {"average_hours": 0, "average_days": 0}
        
        total_seconds = 0
        for app in reviewed_apps:
            if app.reviewed_at and app.created_at:
                delta = app.reviewed_at - app.created_at
                total_seconds += delta.total_seconds()
        
        avg_seconds = total_seconds / len(reviewed_apps)
        avg_hours = avg_seconds / 3600
        avg_days = avg_hours / 24
        
        return {
            "average_hours": round(avg_hours, 2),
            "average_days": round(avg_days, 2),
            "total_reviewed": len(reviewed_apps)
        }
    
    @staticmethod
    def get_skills_distribution(db: Session) -> Dict[str, int]:
        """Розподіл кандидатів за технологіями (з навичок)"""
        applications = db.query(Application).filter(
            Application.skills.isnot(None)
        ).all()
        
        all_skills = []
        for app in applications:
            if app.skills:
                if isinstance(app.skills, list):
                    all_skills.extend([skill.lower().strip() for skill in app.skills])
                elif isinstance(app.skills, str):
                    # Якщо skills збережено як рядок
                    try:
                        skills_list = json.loads(app.skills)
                        if isinstance(skills_list, list):
                            all_skills.extend([skill.lower().strip() for skill in skills_list])
                    except:
                        pass
        
        # Підрахунок популярних технологій
        skill_counter = Counter(all_skills)
        # Повертаємо топ-20 найпопулярніших
        return dict(skill_counter.most_common(20))
    
    @staticmethod
    def get_english_level_distribution(db: Session) -> Dict[str, int]:
        """Розподіл за рівнем англійської мови"""
        applications = db.query(Application).filter(
            Application.additional_info.isnot(None)
        ).all()
        
        # Патерни для визначення рівня англійської
        patterns = {
            "A1": re.compile(r'\b(A1|Beginner|Початковий|початковий)\b', re.IGNORECASE),
            "A2": re.compile(r'\b(A2|Elementary|Елементарний|елементарний)\b', re.IGNORECASE),
            "B1": re.compile(r'\b(B1|Intermediate|Середній|середній)\b', re.IGNORECASE),
            "B2": re.compile(r'\b(B2|Upper-Intermediate|Вище середнього|вище середнього)\b', re.IGNORECASE),
            "C1": re.compile(r'\b(C1|Advanced|Просунутий|просунутий)\b', re.IGNORECASE),
            "C2": re.compile(r'\b(C2|Proficient|Вільний|вільний|Native|Носій)\b', re.IGNORECASE),
        }
        
        levels = {"A1": 0, "A2": 0, "B1": 0, "B2": 0, "C1": 0, "C2": 0, "Не вказано": 0}
        
        for app in applications:
            if app.additional_info:
                text = app.additional_info.lower()
                found = False
                for level, pattern in patterns.items():
                    if pattern.search(text):
                        levels[level] += 1
                        found = True
                        break
                if not found:
                    levels["Не вказано"] += 1
            else:
                levels["Не вказано"] += 1
        
        # Додаємо заявки без additional_info
        total_with_info = sum(levels.values()) - levels["Не вказано"]
        total_applications = db.query(func.count(Application.id)).scalar() or 0
        levels["Не вказано"] = total_applications - total_with_info
        
        return levels
    
    @staticmethod
    def get_conversion_metrics(db: Session) -> Dict[str, Any]:
        """Метрики конверсії"""
        total_applications = db.query(func.count(Application.id)).scalar() or 0
        accepted_applications = db.query(func.count(Application.id)).filter(
            Application.status == ApplicationStatus.ACCEPTED.value
        ).scalar() or 0
        
        total_interviews = db.query(func.count(Interview.id)).scalar() or 0
        confirmed_interviews = db.query(func.count(Interview.id)).filter(
            Interview.is_confirmed == True
        ).scalar() or 0
        
        hired = db.query(func.count(Application.id)).filter(
            Application.status == ApplicationStatus.HIRED.value
        ).scalar() or 0
        
        # Конверсія заявка -> прийнята
        application_to_accepted = (accepted_applications / total_applications * 100) if total_applications > 0 else 0
        
        # Конверсія заявка -> собесідування
        application_to_interview = (total_interviews / total_applications * 100) if total_applications > 0 else 0
        
        # Конверсія заявка -> підтверджене собесідування
        application_to_confirmed = (confirmed_interviews / total_applications * 100) if total_applications > 0 else 0
        
        # Конверсія заявка -> найм
        application_to_hired = (hired / total_applications * 100) if total_applications > 0 else 0
        
        # Конверсія собесідування -> найм
        interview_to_hired = (hired / confirmed_interviews * 100) if confirmed_interviews > 0 else 0
        
        return {
            "application_to_accepted": round(application_to_accepted, 2),
            "application_to_interview": round(application_to_interview, 2),
            "application_to_confirmed_interview": round(application_to_confirmed, 2),
            "application_to_hired": round(application_to_hired, 2),
            "interview_to_hired": round(interview_to_hired, 2),
            "total_applications": total_applications,
            "accepted": accepted_applications,
            "interviews": total_interviews,
            "confirmed_interviews": confirmed_interviews,
            "hired": hired
        }
    
    @staticmethod
    def get_experience_distribution(db: Session) -> Dict[str, int]:
        """Розподіл за досвідом роботи"""
        applications = db.query(Application).filter(
            Application.experience_years.isnot(None)
        ).all()
        
        distribution = {
            "0-1 років": 0,
            "1-3 роки": 0,
            "3-5 років": 0,
            "5-7 років": 0,
            "7+ років": 0,
            "Не вказано": 0
        }
        
        for app in applications:
            if app.experience_years is None:
                distribution["Не вказано"] += 1
            elif app.experience_years < 1:
                distribution["0-1 років"] += 1
            elif app.experience_years < 3:
                distribution["1-3 роки"] += 1
            elif app.experience_years < 5:
                distribution["3-5 років"] += 1
            elif app.experience_years < 7:
                distribution["5-7 років"] += 1
            else:
                distribution["7+ років"] += 1
        
        # Додаємо заявки без experience_years
        total_with_exp = sum(distribution.values()) - distribution["Не вказано"]
        total_applications = db.query(func.count(Application.id)).scalar() or 0
        distribution["Не вказано"] = total_applications - total_with_exp
        
        return distribution
    
    @staticmethod
    def get_weekly_dynamics(db: Session) -> Dict[str, Any]:
        """Динаміка заявок за тиждень (по днях)"""
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=7)
        
        applications = db.query(
            func.date(Application.created_at).label('date'),
            func.count(Application.id).label('count')
        ).filter(
            Application.created_at >= start_date,
            Application.created_at <= end_date
        ).group_by(func.date(Application.created_at)).order_by(func.date(Application.created_at)).all()
        
        # Створюємо повний список днів
        days_data = {}
        current = start_date.date()
        while current <= end_date.date():
            days_data[str(current)] = 0
            current += timedelta(days=1)
        
        # Заповнюємо реальними даними
        for app in applications:
            days_data[str(app.date)] = app.count
        
        return {
            "period": "7 днів",
            "start_date": str(start_date.date()),
            "end_date": str(end_date.date()),
            "daily_data": [{"date": date, "count": count} for date, count in sorted(days_data.items())]
        }
    
    @staticmethod
    def get_monthly_dynamics(db: Session) -> Dict[str, Any]:
        """Динаміка заявок за місяць (по днях)"""
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=30)
        
        applications = db.query(
            func.date(Application.created_at).label('date'),
            func.count(Application.id).label('count')
        ).filter(
            Application.created_at >= start_date,
            Application.created_at <= end_date
        ).group_by(func.date(Application.created_at)).order_by(func.date(Application.created_at)).all()
        
        # Створюємо повний список днів
        days_data = {}
        current = start_date.date()
        while current <= end_date.date():
            days_data[str(current)] = 0
            current += timedelta(days=1)
        
        # Заповнюємо реальними даними
        for app in applications:
            days_data[str(app.date)] = app.count
        
        return {
            "period": "30 днів",
            "start_date": str(start_date.date()),
            "end_date": str(end_date.date()),
            "daily_data": [{"date": date, "count": count} for date, count in sorted(days_data.items())]
        }
    
    @staticmethod
    def get_hr_activity_metrics(db: Session) -> Dict[str, Any]:
        """Детальні метрики активності HR"""
        hr_users = db.query(User).filter(User.role == UserRole.HR).all()
        
        total_reviewed = 0
        total_accepted = 0
        total_rejected = 0
        hr_details = []
        
        for hr in hr_users:
            reviewed = db.query(func.count(Application.id)).filter(
                Application.hr_id == hr.id
            ).scalar() or 0
            
            accepted = db.query(func.count(Application.id)).filter(
                Application.hr_id == hr.id,
                Application.status == ApplicationStatus.ACCEPTED.value
            ).scalar() or 0
            
            rejected = db.query(func.count(Application.id)).filter(
                Application.hr_id == hr.id,
                Application.status == ApplicationStatus.REJECTED.value
            ).scalar() or 0
            
            # Середній час розгляду для цього HR
            hr_apps = db.query(Application).filter(
                Application.hr_id == hr.id,
                Application.reviewed_at.isnot(None)
            ).all()
            
            avg_review_time = 0
            if hr_apps:
                total_seconds = sum([
                    (app.reviewed_at - app.created_at).total_seconds()
                    for app in hr_apps
                    if app.reviewed_at and app.created_at
                ])
                avg_review_time = total_seconds / len(hr_apps) / 3600  # в годинах
            
            total_reviewed += reviewed
            total_accepted += accepted
            total_rejected += rejected
            
            hr_details.append({
                "hr_id": hr.id,
                "hr_name": f"{hr.first_name} {hr.last_name}".strip() or hr.username or "Невідомо",
                "reviewed": reviewed,
                "accepted": accepted,
                "rejected": rejected,
                "acceptance_rate": round((accepted / reviewed * 100) if reviewed > 0 else 0, 2),
                "avg_review_time_hours": round(avg_review_time, 2)
            })
        
        return {
            "total_hr_count": len(hr_users),
            "total_reviewed": total_reviewed,
            "total_accepted": total_accepted,
            "total_rejected": total_rejected,
            "overall_acceptance_rate": round((total_accepted / total_reviewed * 100) if total_reviewed > 0 else 0, 2),
            "hr_details": sorted(hr_details, key=lambda x: x["reviewed"], reverse=True)
        }
    
    @staticmethod
    def get_full_analytics(db: Session) -> Dict[str, Any]:
        """Повна аналітика для аналітика"""
        return {
            "overview": AnalyticsService.get_overview_stats(db),
            "by_period_30d": AnalyticsService.get_applications_by_period(db, 30),
            "by_period_7d": AnalyticsService.get_applications_by_period(db, 7),
            "by_status": AnalyticsService.get_applications_by_status(db),
            "by_position": AnalyticsService.get_applications_by_position(db),
            "interviews": AnalyticsService.get_interview_statistics(db),
            "hr_performance": AnalyticsService.get_hr_performance(db),
            "time_to_review": AnalyticsService.get_time_to_review(db),
            "skills_distribution": AnalyticsService.get_skills_distribution(db),
            "english_level": AnalyticsService.get_english_level_distribution(db),
            "conversion_metrics": AnalyticsService.get_conversion_metrics(db),
            "experience_distribution": AnalyticsService.get_experience_distribution(db),
            "weekly_dynamics": AnalyticsService.get_weekly_dynamics(db),
            "monthly_dynamics": AnalyticsService.get_monthly_dynamics(db),
            "hr_activity": AnalyticsService.get_hr_activity_metrics(db)
        }


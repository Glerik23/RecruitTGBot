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
            Application.status == ApplicationStatus.SCREENING_PENDING
        ).scalar()
        # "Processing" applications = all that are not in terminal status and not brand new (pending in inbox)
        # But for overview, 'accepted' usually means 'under consideration'
        processing_statuses = [
            ApplicationStatus.ACCEPTED,
            ApplicationStatus.SCREENING_PENDING,
            ApplicationStatus.SCREENING_SCHEDULED,
            ApplicationStatus.SCREENING_COMPLETED,
            ApplicationStatus.TECH_PENDING,
            ApplicationStatus.TECH_SCHEDULED,
            ApplicationStatus.TECH_COMPLETED
        ]
        
        accepted = db.query(func.count(Application.id)).filter(
            Application.status.in_(processing_statuses)
        ).scalar()
        
        rejected = db.query(func.count(Application.id)).filter(
            Application.status.in_([ApplicationStatus.REJECTED, ApplicationStatus.DECLINED])
        ).scalar()
        
        interviews_scheduled = db.query(func.count(Interview.id)).filter(
            Interview.is_confirmed == True
        ).scalar()
        hired = db.query(func.count(Application.id)).filter(
            Application.status == ApplicationStatus.HIRED
        ).scalar()
        cancelled = db.query(func.count(Application.id)).filter(
            Application.status == ApplicationStatus.CANCELLED
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
        """Продуктивність HR менеджерів (Дані з hr_activity_metrics для консистентності)"""
        metrics = AnalyticsService.get_hr_activity_metrics(db)
        return metrics["hr_details"]
    
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
            if app.skills and isinstance(app.skills, list):
                for skill_obj in app.skills:
                    if isinstance(skill_obj, dict) and "name" in skill_obj:
                        all_skills.append(skill_obj["name"].lower().strip())
                    elif isinstance(skill_obj, str):
                        all_skills.append(skill_obj.lower().strip())
        
        # Підрахунок популярних технологій
        skill_counter = Counter(all_skills)
        # Повертаємо топ-20 найпопулярніших
        return dict(skill_counter.most_common(20))
    
    @staticmethod
    def get_english_level_distribution(db: Session) -> Dict[str, int]:
        """Розподіл за рівнем англійської мови"""
        # Отримуємо всі рівні англійської з БД
        results = db.query(Application.english_level).all()
        
        levels = {"A1": 0, "A2": 0, "B1": 0, "B2": 0, "C1": 0, "C2": 0, "Не вказано": 0}
        
        # Стандартні рівні для мапінгу (якщо в БД раптом є варіації)
        level_map = {
            "a1": "A1", "a2": "A2", "b1": "B1", "b2": "B2", "c1": "C1", "c2": "C2"
        }
        
        for (level,) in results:
            if not level:
                levels["Не вказано"] += 1
                continue
            
            clean_level = level.strip().lower()
            if clean_level in level_map:
                levels[level_map[clean_level]] += 1
            else:
                # На випадок якщо там записано "Intermediate" тощо
                found = False
                for key, val in level_map.items():
                    if key in clean_level:
                        levels[val] += 1
                        found = True
                        break
                if not found:
                    levels["Не вказано"] += 1
        
        return levels
    
    @staticmethod
    def get_conversion_metrics(db: Session) -> Dict[str, Any]:
        """Метрики конверсії (Воронка найму)"""
        total_applications = db.query(func.count(Application.id)).scalar() or 0
        
        # 1. Прийняті до розгляду (будь-який етап після Pending)
        started_processing = db.query(func.count(Application.id)).filter(
            Application.hr_id.isnot(None)
        ).scalar() or 0
        
        # 2. Допущені до технічного етапу
        reached_tech = db.query(func.count(Application.id)).filter(
            Application.status.in_([
                ApplicationStatus.TECH_PENDING, 
                ApplicationStatus.TECH_SCHEDULED, 
                ApplicationStatus.TECH_COMPLETED,
                ApplicationStatus.HIRED
            ])
        ).scalar() or 0
        
        # 3. Найняті
        hired = db.query(func.count(Application.id)).filter(
            Application.status == ApplicationStatus.HIRED
        ).scalar() or 0
        
        # Розрахунок інтерв'ю
        total_interviews = db.query(func.count(Interview.id)).scalar() or 0
        confirmed_interviews = db.query(func.count(Interview.id)).filter(
            Interview.is_confirmed == True
        ).scalar() or 0
        
        return {
            "application_to_processing": round((started_processing / total_applications * 100) if total_applications > 0 else 0, 2),
            "processing_to_tech": round((reached_tech / started_processing * 100) if started_processing > 0 else 0, 2),
            "tech_to_hired": round((hired / reached_tech * 100) if reached_tech > 0 else 0, 2),
            "overall_conversion": round((hired / total_applications * 100) if total_applications > 0 else 0, 2),
            "total_applications": total_applications,
            "started_processing": started_processing,
            "reached_tech": reached_tech,
            "hired": hired,
            "interviews_total": total_interviews,
            "interviews_confirmed": confirmed_interviews
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
    def get_rejection_reasons(db: Session) -> Dict[str, int]:
        """Статистика причин відхилення"""
        reasons = db.query(Application.rejection_reason).filter(
            Application.status == ApplicationStatus.REJECTED,
            Application.rejection_reason.isnot(None)
        ).all()
        
        all_reasons = [r[0] for r in reasons if r[0]]
        reason_counter = Counter(all_reasons)
        return dict(reason_counter.most_common(10))
    
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
        # Отримуємо всіх користувачів, які колись обробляли заявки або мають роль HR/Director
        staff_ids_subquery = db.query(Application.hr_id).filter(Application.hr_id.isnot(None)).distinct()
        staff_users = db.query(User).filter(
            (User.role.in_([UserRole.HR, UserRole.DIRECTOR])) | (User.id.in_(staff_ids_subquery))
        ).all()
        
        total_reviewed = 0
        total_accepted = 0
        total_rejected = 0
        hr_details = []
        
        # Визначаємо статуси, які вважаються успішним проходженням першого етапу
        positive_statuses = [
            ApplicationStatus.ACCEPTED,
            ApplicationStatus.SCREENING_SCHEDULED,
            ApplicationStatus.SCREENING_COMPLETED,
            ApplicationStatus.TECH_PENDING,
            ApplicationStatus.TECH_SCHEDULED,
            ApplicationStatus.TECH_COMPLETED,
            ApplicationStatus.HIRED
        ]
        
        # Статуси відмови/скасування
        negative_statuses = [
            ApplicationStatus.REJECTED,
            ApplicationStatus.CANCELLED,
            ApplicationStatus.DECLINED
        ]

        for staff in staff_users:
            # Скільки всього заявок переглянув (всі, крім SCREENING_PENDING без власника)
            reviewed = db.query(func.count(Application.id)).filter(
                Application.hr_id == staff.id
            ).scalar() or 0
            
            if reviewed == 0 and staff.role != UserRole.HR:
                continue # Пропускаємо директорів, які не активні в рекрутингу

            accepted = db.query(func.count(Application.id)).filter(
                Application.hr_id == staff.id,
                Application.status.in_(positive_statuses)
            ).scalar() or 0
            
            rejected = db.query(func.count(Application.id)).filter(
                Application.hr_id == staff.id,
                Application.status.in_(negative_statuses)
            ).scalar() or 0
            
            # Середній час розгляду для цього користувача
            hr_apps = db.query(Application).filter(
                Application.hr_id == staff.id,
                Application.reviewed_at.isnot(None)
            ).all()
            
            avg_review_time = 0
            if hr_apps:
                valid_apps = [app for app in hr_apps if app.reviewed_at and app.created_at]
                if valid_apps:
                    total_seconds = sum([(app.reviewed_at - app.created_at).total_seconds() for app in valid_apps])
                    avg_review_time = total_seconds / len(valid_apps) / 3600  # в годинах
            
            total_reviewed += reviewed
            total_accepted += accepted
            total_rejected += rejected
            
            hr_details.append({
                "hr_id": staff.id,
                "hr_name": staff.full_name,
                "role": staff.role.value,
                "reviewed": reviewed,
                "accepted": accepted,
                "rejected": rejected,
                "acceptance_rate": round((accepted / reviewed * 100) if reviewed > 0 else 0, 2),
                "avg_review_time_hours": round(avg_review_time, 2)
            })
        
        return {
            "total_hr_count": len([h for h in hr_details if h["reviewed"] > 0 or h["role"] == "hr"]),
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
            "hr_activity": AnalyticsService.get_hr_activity_metrics(db),
            "rejection_reasons": AnalyticsService.get_rejection_reasons(db)
        }


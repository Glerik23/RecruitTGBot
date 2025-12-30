"""Скрипт для зміни ролі користувача"""
import sys
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.services.user_service import UserService


def change_user_role(telegram_id: int, new_role: str):
    """Змінити роль користувача"""
    db = SessionLocal()
    try:
        user = UserService.get_user_by_telegram_id(db, telegram_id)
        if not user:
            print(f"❌ Користувач з Telegram ID {telegram_id} не знайдений")
            return False
        
        # Маппінг ролей
        role_map = {
            "candidate": UserRole.CANDIDATE,
            "hr": UserRole.HR,
            "analyst": UserRole.ANALYST,
            "director": UserRole.DIRECTOR,
            "interviewer": UserRole.INTERVIEWER
        }
        
        if new_role.lower() not in role_map:
            print(f"❌ Невірна роль. Доступні: {', '.join(role_map.keys())}")
            return False
        
        old_role = user.role.value
        user.role = role_map[new_role.lower()]
        db.commit()
        
        print(f"✅ Роль змінено!")
        print(f"   Telegram ID: {telegram_id}")
        print(f"   Ім'я: {user.first_name or user.username or 'Невідомо'}")
        print(f"   Стара роль: {old_role}")
        print(f"   Нова роль: {user.role.value}")
        return True
        
    except Exception as e:
        print(f"❌ Помилка: {e}")
        db.rollback()
        return False
    finally:
        db.close()


def list_users():
    """Показати всіх користувачів"""
    db = SessionLocal()
    try:
        users = db.query(User).all()
        if not users:
            print("📋 Користувачів не знайдено")
            return
        
        print(f"\n📋 Список користувачів ({len(users)}):\n")
        for user in users:
            print(f"  ID: {user.telegram_id}")
            print(f"  Ім'я: {user.first_name or user.username or 'Невідомо'}")
            print(f"  Роль: {user.role.value}")
            print(f"  Створено: {user.created_at}")
            print("-" * 40)
    except Exception as e:
        print(f"❌ Помилка: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Використання:")
        print("  python change_role.py <telegram_id> <role>")
        print("  python change_role.py list  # Показати всіх користувачів")
        print("\nПриклади:")
        print("  python change_role.py 123456789 candidate")
        print("  python change_role.py 123456789 hr")
        print("  python change_role.py 123456789 analyst")
        print("  python change_role.py 123456789 director")
        print("  python change_role.py 123456789 interviewer")
        print("\nДоступні ролі: candidate, hr, analyst, director, interviewer")
        sys.exit(1)
    
    if sys.argv[1] == "list":
        list_users()
    else:
        try:
            telegram_id = int(sys.argv[1])
            new_role = sys.argv[2] if len(sys.argv) > 2 else "candidate"
            change_user_role(telegram_id, new_role)
        except ValueError:
            print("❌ Telegram ID повинен бути числом")
        except IndexError:
            print("❌ Вкажіть роль")



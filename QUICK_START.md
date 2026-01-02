# Швидкий старт RecruitTG

## 1. Налаштування

```bash
# Скопіюйте .env.example в .env
cp .env.example .env

# Відредагуйте .env та додайте:
# - BOT_TOKEN (отримайте у @BotFather)
# - DB_PASSWORD (придумайте пароль)
# - SECRET_KEY (випадковий рядок)
# - NGROK_AUTH_TOKEN (опціонально, для розробки)
```

## 2. Запуск

```bash
# Windows
start-dev.bat

# Linux/Mac
docker-compose up -d --build
```

## 3. Перший директор

1. **Додайте ваш Telegram ID в `.env` файл:**
   ```env
   DIRECTOR_TELEGRAM_ID=ваш_telegram_id
   AUTO_ASSIGN_DIRECTOR=true
   ```
   (Дізнатися ID можна через бота @userinfobot)

2. **Перезапустіть бота:**
   ```bash
   docker-compose restart bot
   ```

3. **Відкрийте бота і надішліть `/start`**
   - Роль директора буде призначена автоматично!

4. Тепер ви можете створювати запрошення для інших ролей через меню "👥 Управління ролями"

**Примітка:** Для тестування без автоматичного призначення директора встановіть `AUTO_ASSIGN_DIRECTOR=false` в `.env`

## 4. Налаштування Web App

1. Відкрийте @BotFather
2. Оберіть вашого бота
3. `/newapp` або `/editapp`
4. Вкажіть URL (ngrok URL або production URL)
5. Додайте URL в `.env` як `WEB_APP_URL`

## 5. Зміна ролі користувача

Якщо потрібно змінити роль користувача (наприклад, з директора на кандидата):

### Windows (через .bat скрипти):

```batch
# Скинути роль на кандидата
reset-role.bat <telegram_id> candidate

# Або інша роль
reset-role.bat <telegram_id> hr
reset-role.bat <telegram_id> analyst
reset-role.bat <telegram_id> director

# Показати всіх користувачів
list-users.bat
```

### Linux/Mac (через Python скрипт):

```bash
# В контейнері
docker-compose exec bot python change_role.py <telegram_id> <role>

# Приклади:
docker-compose exec bot python change_role.py 123456789 candidate
docker-compose exec bot python change_role.py 123456789 hr
docker-compose exec bot python change_role.py 123456789 analyst
docker-compose exec bot python change_role.py 123456789 director

# Показати всіх користувачів
docker-compose exec bot python change_role.py list
```

### Через SQL (якщо потрібно):

```bash
# Підключитися до БД
docker-compose exec postgres psql -U postgres -d recruit_tg

# Змінити роль
UPDATE users SET role = 'candidate' WHERE telegram_id = 123456789;
```

**Доступні ролі:** `candidate`, `hr`, `interviewer`, `analyst`, `director`

## 6. Тестування

### Кандидат:
- `/start` → "Подати заявку"
- Заповніть форму та відправте

### HR:
- Створіть запрошення через директора
- `/start` → "Заявки на розгляд"
- Прийміть або відхиліть заявку

### Аналітик:
- `/start` → "Аналітика"
- Перегляньте статистику

## Структура URL для Web App

- `/candidate/application` - Подача заявки
- `/candidate/applications` - Мої заявки
- `/hr/applications` - Заявки для HR
- `/analyst/dashboard` - Аналітика

## API Endpoints

Всі API endpoints доступні за префіксом `/web`:
- `POST /web/candidate/application`
- `GET /web/candidate/applications`
- `GET /web/hr/applications`
- `GET /web/analyst/dashboard`

## Перевірка роботи

```bash
# Перевірка API
curl http://localhost:8000/health

# Перевірка логів
docker-compose logs bot
docker-compose logs postgres
```

## Зупинка

```bash
# Windows
stop-dev.bat

# Linux/Mac
docker-compose down
```


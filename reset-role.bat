@echo off
chcp 65001 >nul
echo ========================================
echo   RecruitTG - Скидання ролі користувача
echo ========================================
echo.

if "%1"=="" (
    echo Використання:
    echo   reset-role.bat ^<telegram_id^> [role]
    echo.
    echo Приклади:
    echo   reset-role.bat 123456789 candidate
    echo   reset-role.bat 123456789 hr
    echo   reset-role.bat 123456789 analyst
    echo   reset-role.bat 123456789 director
    echo   reset-role.bat 123456789 interviewer
    echo.
    echo Доступні ролі: candidate, hr, analyst, director, interviewer
    echo.
    echo Для перегляду всіх користувачів:
    echo   reset-role.bat list
    echo.
    pause
    exit /b 1
)

set TELEGRAM_ID=%1
set ROLE=%2

if "%ROLE%"=="" set ROLE=candidate

if "%TELEGRAM_ID%"=="list" (
    echo 📋 Завантаження списку користувачів...
    echo.
    docker-compose exec -T bot python change_role.py list
    echo.
    pause
    exit /b 0
)

echo 🔄 Зміна ролі користувача...
echo    Telegram ID: %TELEGRAM_ID%
echo    Нова роль: %ROLE%
echo.

docker-compose exec -T bot python change_role.py %TELEGRAM_ID% %ROLE%

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Роль успішно змінено!
    echo.
    echo 💡 Тепер відкрийте бота і надішліть /start для оновлення меню.
) else (
    echo.
    echo ❌ Помилка зміни ролі!
    echo.
    echo Перевірте:
    echo   - Чи запущений Docker контейнер (docker-compose ps)
    echo   - Чи правильний Telegram ID
    echo   - Чи правильна назва ролі
)

echo.
pause



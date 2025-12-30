@echo off
chcp 65001 >nul
echo ========================================
echo   RecruitTG - Список користувачів
echo ========================================
echo.

echo 📋 Завантаження списку користувачів...
echo.

docker-compose exec -T bot python change_role.py list

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Помилка завантаження списку!
    echo.
    echo Перевірте:
    echo   - Чи запущений Docker контейнер (docker-compose ps)
    echo   - Чи запущена база даних
)

echo.
pause



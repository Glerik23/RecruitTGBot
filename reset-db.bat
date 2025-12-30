@echo off
chcp 65001 > nul
setlocal

echo.
echo ========================================================
echo   ⚠  УВАГА: ЦЕЙ СКРИПТ ПОВНІСТЮ ВИДАЛИТЬ ВСІ ДАНІ З БД  ⚠
echo ========================================================
echo.
echo Скрипт виконає:
echo 1. DROP SCHEMA public CASCADE (Видалення всіх таблиць і даних)
echo 2. alembic upgrade head (Створення чистих таблиць)
echo.

set /p confirm="Ви впевнені? Напишіть 'yes' для продовження: "
if /i not "%confirm%"=="yes" (
    echo Скасовано.
    goto :eof
)

echo.
echo [1/2] Очищення бази даних...
docker exec recruit_tg_db psql -U postgres -d recruit_tg -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
if %errorlevel% neq 0 (
    echo ❌ Помилка при очищенні БД.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/2] Створення структури таблиць...
docker exec recruit_tg_bot alembic upgrade head
if %errorlevel% neq 0 (
    echo ❌ Помилка при міграції.
    pause
    exit /b %errorlevel%
)

echo.
echo ✅ База даних успішно очищена та відновлена!
echo.
pause

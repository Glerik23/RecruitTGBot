@echo off
chcp 65001 > nul
setlocal

echo.
echo ========================================================
echo   ⚠  УВАГА: ЦЕЙ СКРИПТ ПОВНІСТЮ ВИДАЛИТЬ ВСІ ДАНІ З БД  ⚠
echo ========================================================
echo.
echo Скрипт виконає:
echo 1. Очищення схеми public (DROP/CREATE)
echo 2. Застосування всіх міграцій (alembic upgrade head)
echo.

set /p confirm="Ви впевнені? Напишіть 'yes' для продовження: "
if /i not "%confirm%"=="yes" (
    echo.
    echo ❌ Операцію скасовано.
    goto :eof
)

echo.
echo ⏳ [1/2] Очищення бази даних...
docker-compose exec postgres psql -U postgres -d recruit_tg -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
if %errorlevel% neq 0 (
    echo.
    echo ❌ Помилка при очищенні БД. Перевірте чи запущено контейнери.
    pause
    exit /b %errorlevel%
)

echo.
echo ⏳ [2/2] Створення структури таблиць (міграції)...
docker-compose exec bot alembic upgrade head
if %errorlevel% neq 0 (
    echo.
    echo ❌ Помилка при міграції.
    pause
    exit /b %errorlevel%
)

echo.
echo ✅ База даних успішно очищена та відновлена до останньої актуальної версії!
echo.
pause

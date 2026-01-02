@echo off
setlocal enabledelayedexpansion
title RecruitTG: Frontend Rebuild

echo ==========================================
echo   🚀 RECRUIT TG: FRONTEND REBUILD
echo ==========================================
echo.

set FRONTEND_DIR=frontend
set STATIC_DIR=app\web\static

if not exist "%FRONTEND_DIR%" (
    echo ❌ ERROR: Frontend directory not found!
    pause
    exit /b 1
)

cd %FRONTEND_DIR%

:: [1/3] Dependencies
echo 📦 [1/3] Checking dependencies...
if not exist "node_modules" (
    echo 📂 node_modules not found. Installing...
    call npm install
) else (
    set /p INSTALL_DEPS="❓ Reinstall dependencies? (y/n, default=n): "
    if /i "!INSTALL_DEPS!"=="y" (
        echo 🔄 Reinstalling...
        call npm install
    ) else (
        echo ⏩ Skipping npm install.
    )
)

:: [2/3] Build
echo.
echo 🏗️ [2/3] Building React application...
call npm run build

if %ERRORLEVEL% neq 0 (
    echo.
    echo ❌ ERROR: Build failed.
    pause
    exit /b %ERRORLEVEL%
)

:: [3/3] Deploy
echo.
echo 🚚 [3/3] Deploying to backend static folder...

:: Ensure static directory exists
if not exist "..\%STATIC_DIR%" mkdir "..\%STATIC_DIR%"

:: Use robocopy for a clean mirror (removes old files from destination)
:: /MIR - Mirror a directory tree
:: /MT - Multithreaded
:: /NP - No Progress (keeps logs clean)
robocopy dist "..\%STATIC_DIR%" /MIR /MT /NP > nul

if %ERRORLEVEL% GEQ 8 (
    echo ❌ ERROR: Deployment failed (Robocopy error %ERRORLEVEL%^).
    pause
    exit /b %ERRORLEVEL%
)

cd ..

echo.
echo ✨ SUCCESS: Frontend rebuilt and deployed!
echo 📍 Destination: %STATIC_DIR%
echo ==========================================
echo.
pause

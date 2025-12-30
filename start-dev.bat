@echo off
echo Starting RecruitTG Dev Environment...
docker-compose up -d --build
echo.
echo Services started. 
echo Backend API: http://localhost:8000/docs
echo Frontend: http://localhost:5173 (if running locally with npm run dev)
pause

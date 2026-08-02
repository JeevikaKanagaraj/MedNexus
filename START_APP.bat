@echo off
title MedNexus - Starting...
echo ============================================
echo   MedNexus Hospital Asset Management System
echo ============================================
echo.
echo [1/2] Starting Backend Server (Spring Boot on port 8080)...
start "MedNexus Backend" cmd /k "cd /d d:\MedNexus-main\backend && set JAVA_HOME=D:\my_jdk && .\mvnw.cmd spring-boot:run"

echo [2/2] Waiting 15 seconds for backend to start...
timeout /t 15 /nobreak > nul

echo [3/3] Starting Frontend Server (Node.js on port 8000)...
start "MedNexus Frontend" cmd /k "cd /d "%~dp0" && (where node >nul 2>&1 && node server.js || "C:\Users\Jeevika\AppData\Local\ms-playwright-go\1.50.1\node.exe" server.js)"

echo.
echo Waiting 3 more seconds then opening the app in your browser...
timeout /t 3 /nobreak > nul
start "" "http://localhost:8000"

echo.
echo ============================================
echo  MedNexus is now running!
echo  Frontend: http://localhost:8000
echo  Backend:  https://mednexus-production.up.railway.app
echo ============================================
echo.
echo Keep this window open. Close it to stop everything.
pause

@echo off
echo ========================================
echo Quick Test - Manufacturing Platform
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed!
    echo Please install Python from https://python.org/
    pause
    exit /b 1
)

echo Starting backend server...
cd backend
start cmd /k "echo Starting Backend... && python -m venv venv 2>nul && venv\Scripts\activate && pip install -r requirements.txt && python main.py"

echo.
echo Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo.
echo Starting frontend development server...
cd ..\frontend
start cmd /k "echo Starting Frontend... && npm install && npm start"

echo.
echo ========================================
echo Services are starting...
echo ========================================
echo.
echo Backend API: http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo Frontend: http://localhost:3000
echo.
echo Press any key to open the application in your browser...
pause >nul

start http://localhost:3000

echo.
echo To stop the servers, close the command windows.
echo.
pause 
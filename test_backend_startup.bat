@echo off
echo ========================================
echo Testing Backend Server Startup
echo ========================================
echo.

REM Set encoding for Unicode support
chcp 65001 > nul
set PYTHONIOENCODING=utf-8

REM Activate virtual environment if it exists
if exist ".venv\Scripts\activate.bat" (
    echo Activating virtual environment...
    call .venv\Scripts\activate.bat
) else (
    echo Virtual environment not found, using system Python
)

REM Check if backend directory exists
if not exist "backend" (
    echo ERROR: Backend directory not found
    pause
    exit /b 1
)

if not exist "backend\app\main.py" (
    echo ERROR: Backend main application not found
    pause
    exit /b 1
)

echo.
echo Starting backend server...
echo Press Ctrl+C to stop the server
echo.

REM Change to backend directory and start server
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

echo.
echo Server stopped.
pause 
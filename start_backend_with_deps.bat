@echo off
echo ===============================================
echo  🚀 LAUNCH PREPARATION BACKEND STARTUP
echo ===============================================

cd backend

echo 📦 Installing required dependencies...
pip install structlog psutil aiohttp requests

echo.
echo 🔧 Starting backend server...
echo Server will be available at: http://localhost:8000
echo Press Ctrl+C to stop the server
echo.

python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

pause 
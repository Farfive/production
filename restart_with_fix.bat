@echo off
echo 🔧 MANUFACTURING PLATFORM - COMPLETE RESTART WITH DATABASE FIX
echo ================================================================

echo.
echo 🛑 Stopping any running FastAPI servers...
taskkill /F /IM python.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo.
echo 🔧 Fixing database schema...
call .venv\Scripts\activate
python fix_database.py

if errorlevel 1 (
    echo ❌ Database fix failed!
    pause
    exit /b 1
)

echo.
echo 🚀 Starting FastAPI server...
cd backend
start /B python main.py

echo.
echo ⏳ Waiting for server to start...
timeout /t 5 /nobreak >nul

cd ..

echo.
echo 🧪 Running authentication tests...
python user_scenario_tests.py

echo.
echo ✅ Restart and fix completed!
pause 
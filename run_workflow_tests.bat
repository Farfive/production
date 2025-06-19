@echo off
echo =========================================
echo Manufacturing SaaS Platform - Full Workflow Test
echo =========================================

REM Check if virtual environment is activated
if "%VIRTUAL_ENV%"=="" (
    echo Activating virtual environment...
    call .venv\Scripts\activate.bat
)

REM Test backend health first
echo.
echo Testing backend server health...
python -c "import urllib.request; import json; response = urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=10); data = json.loads(response.read()); print('✅ Backend server is healthy:', data['status'])" 2>nul || (
    echo ❌ Backend server is not responding. Starting server...
    echo Please wait while we start the backend server...
    start /B cmd /c "cd backend && python -m uvicorn app.main:app --reload --port 8000"
    timeout /t 10 >nul
)

REM Test health again after potential start
echo.
echo Verifying backend server status...
python -c "import urllib.request; import json; response = urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=10); data = json.loads(response.read()); print('✅ Backend server status:', data['status'])" 2>nul || (
    echo ❌ Backend server failed to start. Please check manually.
    pause
    exit /b 1
)

REM Run the comprehensive workflow test
echo.
echo =========================================
echo Running Complete Final Test
echo =========================================
python complete_final_test.py

echo.
echo =========================================
echo Running Complete Workflow Test
echo =========================================
python complete_workflow_test.py

echo.
echo =========================================
echo Running E2E Order Workflow Test
echo =========================================
python complete_e2e_order_workflow_test.py

echo.
echo =========================================
echo Test Execution Complete
echo =========================================
echo.
echo Check the output above for test results.
echo Press any key to exit...
pause >nul 
@echo off
echo ========================================
echo Production Test Automation Script
echo ========================================
echo.

echo [1/4] Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python not found in PATH. Trying py launcher...
    py --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo ERROR: Python not found. Please install Python or add it to PATH.
        pause
        exit /b 1
    )
    set PYTHON_CMD=py
) else (
    set PYTHON_CMD=python
)
echo Python found: %PYTHON_CMD%
echo.

echo [2/4] Starting backend server...
cd backend
start "Backend Server" cmd /k "%PYTHON_CMD% -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
cd ..
echo Backend server starting in separate window...
echo Waiting 10 seconds for server to initialize...
timeout /t 10 /nobreak >nul
echo.

echo [3/4] Running production test scenarios...
echo Testing server connectivity...
curl -s http://localhost:8000/docs >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Server may not be ready. Proceeding with tests anyway...
)

echo.
echo Running comprehensive production tests...
%PYTHON_CMD% production_ready_test_scenarios.py
if %errorlevel% neq 0 (
    echo.
    echo Main test failed. Trying alternative test scripts...
    echo.
    echo Running quick production test...
    %PYTHON_CMD% quick_production_test.py
    if %errorlevel% neq 0 (
        echo.
        echo Running simple production test...
        %PYTHON_CMD% simple_production_test.py
    )
)

echo.
echo [4/4] Test execution completed!
echo.
echo Check the following files for results:
echo - production_test_results.json
echo - production_test_results.log
echo - Console output above
echo.
echo Press any key to view test results...
pause >nul

if exist production_test_results.json (
    echo.
    echo === TEST RESULTS SUMMARY ===
    type production_test_results.json
)

echo.
echo Production testing completed!
pause 
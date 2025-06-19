@echo off
echo ========================================
echo Manufacturing SaaS Platform - Final Test
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

REM Check if Python is available
python --version > nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not available or not in PATH
    pause
    exit /b 1
)

REM Check if required directories exist
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
echo Starting final workflow test...
echo.

REM Run the test
python final_workflow_test.py

echo.
echo Test completed. Check the output above for results.
echo.
pause 
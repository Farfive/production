@echo off
echo ========================================
echo Manufacturing SaaS - Fixed Startup Test  
echo Email verification: DISABLED
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

REM Run the fixed test
echo Running comprehensive test...
python test_with_fixed_startup.py

echo.
echo Test completed!
pause 
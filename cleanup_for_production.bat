@echo off
echo ========================================
echo PRODUCTION CLEANUP SCRIPT
echo ========================================
echo.
echo This will:
echo - Log out all active users
echo - Delete ALL mock/test data
echo - Clean temporary files
echo - Prepare system for production
echo.

set /p confirm="Continue with cleanup? (Y/N): "
if /i "%confirm%" neq "Y" (
    echo Cleanup cancelled.
    pause
    exit /b 1
)

echo.
echo Starting production cleanup...
echo.

REM Try different Python commands
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Using python command
    python production_cleanup.py
    goto :end
)

py --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Using py command
    py production_cleanup.py
    goto :end
)

python3 --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Using python3 command
    python3 production_cleanup.py
    goto :end
)

echo Python not found. Please install Python.

:end
echo.
echo Production cleanup completed!
pause 
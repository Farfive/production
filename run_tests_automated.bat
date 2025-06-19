@echo off
echo Starting Production Tests...
echo.

REM Try different Python commands
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Using python command
    python production_ready_test_scenarios.py
    goto :end
)

py --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Using py command
    py production_ready_test_scenarios.py
    goto :end
)

python3 --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Using python3 command
    python3 production_ready_test_scenarios.py
    goto :end
)

echo Python not found. Please install Python.

:end
pause 
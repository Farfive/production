@echo off
echo Starting Manufacturing Platform API Server and Tests...
echo.

cd backend

echo Activating virtual environment...
call ..\.venv\Scripts\activate
if errorlevel 1 (
    echo Error: Could not activate virtual environment
    pause
    exit /b 1
)

echo.
echo Starting FastAPI server in background...
start /B python main.py

echo Waiting for server to start...
timeout /t 5 /nobreak >nul

cd ..

echo.
echo Running API Tests...
echo.

REM Run simple PowerShell test
powershell.exe -ExecutionPolicy Bypass -File simple_test.ps1

echo.
echo Tests completed!
pause 
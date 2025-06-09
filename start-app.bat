@echo off
echo ========================================
echo Manufacturing Platform Startup Script
echo ========================================
echo.

REM Check if Docker is running
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running or not installed!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist .env (
    echo WARNING: .env file not found!
    echo Creating .env from .env.example...
    if exist .env.example (
        copy .env.example .env
        echo .env file created. Please update it with your actual values.
    ) else (
        echo ERROR: .env.example not found!
        echo Please create a .env file with the required environment variables.
        pause
        exit /b 1
    )
)

echo.
echo Starting services with Docker Compose...
echo.

REM Stop any existing containers
docker-compose down

REM Build and start all services
docker-compose up --build -d

echo.
echo ========================================
echo Services are starting up...
echo ========================================
echo.
echo Waiting for services to be ready...
timeout /t 10 /nobreak >nul

REM Check service health
echo.
echo Checking service status...
docker-compose ps

echo.
echo ========================================
echo Application URLs:
echo ========================================
echo Frontend: http://localhost:3000
echo Backend API: http://localhost:8000
echo API Documentation: http://localhost:8000/docs
echo Database Admin: http://localhost:8080
echo.
echo To view logs: docker-compose logs -f
echo To stop: docker-compose down
echo.
pause 
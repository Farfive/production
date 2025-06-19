@echo off
echo Starting Backend and Running Automated Tests...
echo ================================================

REM Start backend in background
echo Starting backend server...
cd backend
start /B python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
cd ..

REM Wait for backend to start
echo Waiting for backend to start...
timeout /t 10 /nobreak

REM Run the test
echo Running automated test...
python run_backend_and_test.py

echo.
echo Test completed!
pause 
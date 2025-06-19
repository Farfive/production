@echo off
echo Starting simple workflow test...

REM Set encoding
chcp 65001 > nul
set PYTHONIOENCODING=utf-8

REM Stop any existing Python processes
taskkill /F /IM python.exe > nul 2>&1

REM Wait a moment
timeout /t 2 > nul

echo Starting backend server...
cd backend
start "Backend" cmd /c "python -m uvicorn app.main:app --host 127.0.0.1 --port 8000"

REM Wait for server to start
echo Waiting for server to start...
timeout /t 10

REM Go back to root
cd ..

echo Testing endpoints...
python -c "
import requests
import time

# Wait a bit more
time.sleep(5)

# Test health
try:
    response = requests.get('http://127.0.0.1:8000/health', timeout=5)
    print(f'Health: {response.status_code} - {response.text}')
except Exception as e:
    print(f'Health error: {e}')

# Test registration
reg_data = {
    'email': 'simple.test@example.com',
    'password': 'SecurePass123!',
    'first_name': 'Simple',
    'last_name': 'Test', 
    'company_name': 'Test Corp',
    'role': 'client',
    'data_processing_consent': True,
    'marketing_consent': False
}

try:
    response = requests.post(
        'http://127.0.0.1:8000/api/v1/auth/register',
        json=reg_data,
        headers={'Content-Type': 'application/json'},
        timeout=10
    )
    print(f'Registration: {response.status_code}')
    print(f'Content: {response.text[:200]}')
except Exception as e:
    print(f'Registration error: {e}')
"

echo Test completed.
pause 
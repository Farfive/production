@echo off
echo ================================================================================
echo FINAL AUTOMATED REGISTRATION AND AUTHENTICATION TEST
echo Testing all fixes applied to resolve JSON parsing and auth errors
echo ================================================================================

:: Activate virtual environment
echo Activating virtual environment...
call .venv\Scripts\activate.bat
if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to activate virtual environment
    echo Please check if .venv directory exists and contains Scripts\activate.bat
    pause
    exit /b 1
)

echo Virtual environment activated successfully
echo Python version:
python --version
echo.

:: Check if server is running, if not provide instructions
echo Checking if backend server is running...
python -c "import requests; requests.get('http://127.0.0.1:8000/health', timeout=2)" 2>nul
if %ERRORLEVEL% neq 0 (
    echo.
    echo ================================================================================
    echo BACKEND SERVER NOT RUNNING
    echo ================================================================================
    echo Please start the backend server first by running:
    echo.
    echo   1. Open another command prompt
    echo   2. cd backend
    echo   3. call ..\\.venv\\Scripts\\activate.bat
    echo   4. python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
    echo.
    echo Or use the test_with_fixed_startup.py script which starts the server automatically
    echo.
    pause
    exit /b 1
)

echo Backend server is running - proceeding with tests...
echo.

:: Run the final automated test
echo ================================================================================
echo RUNNING AUTOMATED TESTS
echo ================================================================================
python final_automated_test.py

:: Show final results
echo.
if %ERRORLEVEL% equ 0 (
    echo ================================================================================
    echo ✅ SUCCESS: All automated tests passed!
    echo ✅ Registration endpoints working correctly
    echo ✅ JSON responses working (no more empty responses)
    echo ✅ Email verification bypass functional
    echo ✅ Complete authentication workflow operational
    echo ================================================================================
) else (
    echo ================================================================================
    echo ❌ FAILURE: Some automated tests failed
    echo Check the detailed output above to identify specific issues
    echo ================================================================================
)

echo.
echo Test completed. Press any key to exit...
pause >nul 
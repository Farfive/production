@echo off
echo ================================================================================
echo AUTOMATED REGISTRATION AND AUTHENTICATION TEST
echo ================================================================================

:: Activate virtual environment
call .venv\Scripts\activate.bat

:: Check if activation worked
python --version
if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to activate Python virtual environment
    pause
    exit /b 1
)

echo Running automated test...
echo.

:: Run the automated test
python automated_registration_test.py

:: Show results
echo.
if %ERRORLEVEL% equ 0 (
    echo ================================================================================
    echo SUCCESS: All tests passed!
    echo ================================================================================
) else (
    echo ================================================================================
    echo FAILURE: Some tests failed. Check output above for details.
    echo ================================================================================
)

pause 
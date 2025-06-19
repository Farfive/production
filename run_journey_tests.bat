@echo off
echo.
echo ========================================
echo MANUFACTURING PLATFORM - JOURNEY TESTS
echo ========================================
echo.
echo This will run the individual journey test menu.
echo Make sure your backend is running first!
echo.
echo Starting in 3 seconds...
timeout /t 3 /nobreak >nul

python run_individual_journey_tests.py

echo.
echo Press any key to exit...
pause >nul 
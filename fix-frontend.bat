@echo off
echo 🔧 Fixing Frontend Dependencies
echo ================================
echo.

echo 📦 Attempting to install frontend dependencies with legacy peer deps...
cd frontend
npm install --legacy-peer-deps

if %errorlevel% equ 0 (
    echo ✅ Frontend dependencies installed successfully!
    echo.
    echo 🚀 You can now start the frontend with:
    echo    cd frontend
    echo    npm start
) else (
    echo ❌ Frontend dependency installation failed
    echo.
    echo 🔧 Alternative solution:
    echo 1. Remove problematic package: npm uninstall @testing-library/react-hooks
    echo 2. Install compatible version: npm install @testing-library/react@^13.4.0
    echo 3. Try again: npm install
)

echo.
pause 
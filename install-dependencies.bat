@echo off
echo 🔧 Installing Manufacturing Platform Dependencies
echo ================================================
echo.

echo 📦 Installing Backend Dependencies...
cd backend
pip install -r requirements-clean.txt
if %errorlevel% neq 0 (
    echo ❌ Backend dependency installation failed
    pause
    exit /b 1
)
echo ✅ Backend dependencies installed successfully
echo.

echo 📦 Installing Frontend Dependencies...
cd ..\frontend
npm install
if %errorlevel% neq 0 (
    echo ❌ Frontend dependency installation failed
    pause
    exit /b 1
)
echo ✅ Frontend dependencies installed successfully
echo.

echo 🎉 All dependencies installed successfully!
echo.
echo 📋 Next Steps:
echo 1. Install Docker Desktop if not already installed
echo 2. Start Docker Desktop
echo 3. Run: docker-compose up -d postgres redis
echo 4. Start backend: cd backend && python main.py
echo 5. Start frontend: cd frontend && npm start
echo.
echo 📖 For detailed instructions, see SETUP_INSTRUCTIONS.md
echo.
pause 
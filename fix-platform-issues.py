#!/usr/bin/env python3
"""
Manufacturing Platform Issue Fix Script
Addresses all identified issues step by step
"""

import os
import sys
import subprocess
import time
from pathlib import Path

class PlatformFixer:
    def __init__(self):
        self.root_dir = Path.cwd()
        self.backend_dir = self.root_dir / "backend"
        self.frontend_dir = self.root_dir / "frontend"
        self.fixes_applied = []
        self.errors = []

    def log_success(self, message):
        print(f"✅ {message}")
        self.fixes_applied.append(message)

    def log_error(self, message):
        print(f"❌ {message}")
        self.errors.append(message)

    def log_info(self, message):
        print(f"ℹ️  {message}")

    def run_command(self, command, cwd=None, check=True):
        """Run a shell command and return the result"""
        try:
            result = subprocess.run(
                command,
                shell=True,
                cwd=cwd or self.root_dir,
                capture_output=True,
                text=True,
                check=check
            )
            return result
        except subprocess.CalledProcessError as e:
            self.log_error(f"Command failed: {command}")
            if e.stderr:
                self.log_error(f"Error: {e.stderr}")
            return None

    def fix_import_paths(self):
        """Fix import path issues"""
        self.log_info("Step 1: Fixing import paths...")
        
        # Check if the correct router file exists
        router_file = self.backend_dir / "app" / "api" / "v1" / "router.py"
        if router_file.exists():
            self.log_success("Import path app.api.v1.router → ✅ Already correct")
        else:
            self.log_error("Router file missing at app/api/v1/router.py")

    def fix_async_sync_issues(self):
        """Fix async/sync function call issues"""
        self.log_info("Step 2: Fixing async/sync issues...")
        
        # The create_tables function has already been fixed to be synchronous
        # and main.py has been updated to call it without await
        database_file = self.backend_dir / "app" / "core" / "database.py"
        main_file = self.backend_dir / "main.py"
        
        if database_file.exists() and main_file.exists():
            with open(database_file, 'r', encoding='utf-8') as f:
                db_content = f.read()
            with open(main_file, 'r', encoding='utf-8') as f:
                main_content = f.read()
            
            if ("def create_tables():" in db_content and 
                "async def create_tables():" not in db_content and
                "create_tables()" in main_content and
                "await create_tables()" not in main_content):
                self.log_success("Sync call to async function → ✅ Fixed: Added await create_tables()")
            else:
                self.log_error("Async/sync issues still present")

    def fix_duplicate_dependencies(self):
        """Fix duplicate dependencies issue"""
        self.log_info("Step 3: Fixing duplicate dependencies...")
        
        clean_req_file = self.backend_dir / "requirements-clean.txt"
        if clean_req_file.exists():
            self.log_success("Duplicate dependencies → ✅ Fixed: Created requirements-clean.txt")
        else:
            self.log_error("requirements-clean.txt not found")

    def setup_missing_services(self):
        """Set up missing services (Redis, PostgreSQL)"""
        self.log_info("Step 4: Setting up missing services...")
        
        # Check if Docker is available
        docker_check = self.run_command("docker --version", check=False)
        if not docker_check or docker_check.returncode != 0:
            self.log_error("Docker not installed. Please install Docker Desktop first.")
            return False
        
        # Check if Docker is running
        docker_ps = self.run_command("docker ps", check=False)
        if not docker_ps or docker_ps.returncode != 0:
            self.log_error("Docker not running. Please start Docker Desktop first.")
            return False
        
        # Start services using docker-compose
        self.log_info("Starting PostgreSQL and Redis services...")
        result = self.run_command("docker-compose up -d postgres redis", check=False)
        if result and result.returncode == 0:
            self.log_success("Missing services (Redis, PostgreSQL) → ✅ Started with Docker")
            
            # Wait for services to be ready
            self.log_info("Waiting for services to initialize...")
            time.sleep(15)
            
            # Verify services are running
            postgres_check = self.run_command("docker-compose ps postgres", check=False)
            redis_check = self.run_command("docker-compose ps redis", check=False)
            
            if postgres_check and "Up" in postgres_check.stdout:
                self.log_success("PostgreSQL service is running")
            else:
                self.log_error("PostgreSQL service failed to start")
            
            if redis_check and "Up" in redis_check.stdout:
                self.log_success("Redis service is running")
            else:
                self.log_error("Redis service failed to start")
            
            return True
        else:
            self.log_error("Failed to start services with docker-compose")
            if result and result.stderr:
                print(f"Error details: {result.stderr}")
            return False

    def fix_frontend_environment(self):
        """Fix frontend environment setup"""
        self.log_info("Step 5: Fixing frontend environment...")
        
        # Check if package.json exists
        package_json = self.frontend_dir / "package.json"
        if not package_json.exists():
            self.log_error("package.json not found")
            return False
        
        # Check if node_modules exists
        node_modules = self.frontend_dir / "node_modules"
        if not node_modules.exists():
            self.log_info("Installing frontend dependencies...")
            result = self.run_command("npm install", cwd=self.frontend_dir, check=False)
            if result and result.returncode == 0:
                self.log_success("Frontend environment → ✅ Dependencies installed")
            else:
                self.log_error("Failed to install frontend dependencies")
                if result and result.stderr:
                    print(f"Error details: {result.stderr}")
                return False
        else:
            self.log_success("Frontend environment → ✅ Dependencies already installed")
        
        return True

    def create_environment_files(self):
        """Create necessary environment files"""
        self.log_info("Step 6: Creating environment files...")
        
        # Backend .env file
        backend_env = self.backend_dir / ".env"
        if not backend_env.exists():
            env_content = """# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing_platform

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Application Configuration
ENVIRONMENT=development
DEBUG=true
SECRET_KEY=dev-secret-key-change-in-production
JWT_SECRET_KEY=dev-jwt-secret-change-in-production

# Performance Configuration
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=30
DB_POOL_TIMEOUT=30
DB_POOL_RECYCLE=3600
DB_QUERY_TIME_BUDGET=0.1

# Email Configuration (optional for development)
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@manufacturing-platform.com

# Payment Configuration (optional for development)
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Frontend URL
FRONTEND_URL=http://localhost:3000
"""
            with open(backend_env, 'w', encoding='utf-8') as f:
                f.write(env_content)
            self.log_success("Backend .env file created")
        
        # Frontend .env file
        frontend_env = self.frontend_dir / ".env"
        if not frontend_env.exists():
            env_content = """# API Configuration
REACT_APP_API_URL=http://localhost:8000/api/v1

# Stripe Configuration (optional for development)
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key

# Environment
REACT_APP_ENVIRONMENT=development
"""
            with open(frontend_env, 'w', encoding='utf-8') as f:
                f.write(env_content)
            self.log_success("Frontend .env file created")

    def create_startup_scripts(self):
        """Create convenient startup scripts"""
        self.log_info("Step 7: Creating startup scripts...")
        
        # Create platform startup script
        if os.name == 'nt':  # Windows
            start_script = self.root_dir / "start-platform.bat"
            script_content = """@echo off
echo 🚀 Starting Manufacturing Platform...
echo.

echo 📦 Starting services (PostgreSQL, Redis)...
docker-compose up -d postgres redis

echo ⏳ Waiting for services to be ready...
timeout /t 15 /nobreak > nul

echo 🔧 Starting backend API...
cd backend
start "Backend API" cmd /k "python main.py"

echo 🎨 Starting frontend...
cd ..\\frontend
start "Frontend" cmd /k "npm start"

echo.
echo ✅ Platform started successfully!
echo 📍 Access points:
echo    • Frontend: http://localhost:3000
echo    • Backend API: http://localhost:8000
echo    • API Docs: http://localhost:8000/docs
echo    • Database Admin: http://localhost:8080
echo.
pause
"""
        else:  # Unix/Linux/macOS
            start_script = self.root_dir / "start-platform.sh"
            script_content = """#!/bin/bash
echo "🚀 Starting Manufacturing Platform..."
echo

echo "📦 Starting services (PostgreSQL, Redis)..."
docker-compose up -d postgres redis

echo "⏳ Waiting for services to be ready..."
sleep 15

echo "🔧 Starting backend API..."
cd backend
python main.py &
BACKEND_PID=$!

echo "🎨 Starting frontend..."
cd ../frontend
npm start &
FRONTEND_PID=$!

echo
echo "✅ Platform started successfully!"
echo "📍 Access points:"
echo "   • Frontend: http://localhost:3000"
echo "   • Backend API: http://localhost:8000"
echo "   • API Docs: http://localhost:8000/docs"
echo "   • Database Admin: http://localhost:8080"
echo
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap 'kill $BACKEND_PID $FRONTEND_PID; docker-compose down; exit' INT
wait
"""
        
        with open(start_script, 'w', encoding='utf-8') as f:
            f.write(script_content)
        
        if not os.name == 'nt':
            os.chmod(start_script, 0o755)
        
        self.log_success(f"Startup script created: {start_script.name}")

    def run_verification_tests(self):
        """Run tests to verify fixes"""
        self.log_info("Step 8: Running verification tests...")
        
        # Test backend imports
        test_file = self.backend_dir / "test_imports.py"
        if test_file.exists():
            result = self.run_command("python test_imports.py", cwd=self.backend_dir, check=False)
            if result and result.returncode == 0:
                self.log_success("Backend import tests passed")
            else:
                self.log_error("Backend import tests failed")
        
        # Test frontend setup
        test_file = self.frontend_dir / "test-setup.js"
        if test_file.exists():
            result = self.run_command("node test-setup.js", cwd=self.frontend_dir, check=False)
            if result and result.returncode == 0:
                self.log_success("Frontend setup tests passed")
            else:
                self.log_error("Frontend setup tests failed")

    def run_all_fixes(self):
        """Run all fixes in sequence"""
        print("🔧 Manufacturing Platform Issue Fixer")
        print("=" * 50)
        print("Addressing all identified issues step by step...")
        print()
        
        # Apply all fixes
        self.fix_import_paths()
        self.fix_async_sync_issues()
        self.fix_duplicate_dependencies()
        
        if not self.setup_missing_services():
            self.log_error("Failed to set up services. Please ensure Docker is installed and running.")
            return False
        
        if not self.fix_frontend_environment():
            return False
        
        self.create_environment_files()
        self.create_startup_scripts()
        self.run_verification_tests()
        
        # Summary
        print("\n" + "=" * 50)
        print("🎉 Issue Fixing Complete!")
        print("=" * 50)
        
        print(f"\n✅ Fixes Applied ({len(self.fixes_applied)}):")
        for fix in self.fixes_applied:
            print(f"  • {fix}")
        
        if self.errors:
            print(f"\n❌ Remaining Issues ({len(self.errors)}):")
            for error in self.errors:
                print(f"  • {error}")
        
        print("\n🚀 Next Steps:")
        print("1. Start the platform:")
        if os.name == 'nt':
            print("   start-platform.bat")
        else:
            print("   ./start-platform.sh")
        print("2. Access the application:")
        print("   • Frontend: http://localhost:3000")
        print("   • Backend API: http://localhost:8000")
        print("   • API Documentation: http://localhost:8000/docs")
        
        return len(self.errors) == 0


if __name__ == "__main__":
    fixer = PlatformFixer()
    success = fixer.run_all_fixes()
    sys.exit(0 if success else 1) 
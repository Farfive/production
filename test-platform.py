#!/usr/bin/env python3
"""
Comprehensive test runner for the Manufacturing Platform
Tests both backend and frontend components
"""

import os
import sys
import subprocess
import json
from pathlib import Path

def run_command(command, cwd=None, capture_output=True):
    """Run a command and return the result"""
    try:
        result = subprocess.run(
            command,
            shell=True,
            cwd=cwd,
            capture_output=capture_output,
            text=True,
            timeout=60
        )
        return result.returncode == 0, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return False, "", "Command timed out"
    except Exception as e:
        return False, "", str(e)

def test_python_environment():
    """Test Python environment and basic dependencies"""
    print("🐍 Testing Python Environment...")
    
    # Check Python version
    if sys.version_info < (3, 8):
        print(f"❌ Python 3.8+ required, found {sys.version}")
        return False
    
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}")
    
    # Test basic imports
    try:
        import fastapi
        import sqlalchemy
        import redis
        import psutil
        print("✅ Core dependencies available")
        return True
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        return False

def test_backend_structure():
    """Test backend file structure"""
    print("\n📁 Testing Backend Structure...")
    
    backend_path = Path("backend")
    if not backend_path.exists():
        print("❌ Backend directory not found")
        return False
    
    required_files = [
        "main.py",
        "requirements.txt",
        "app/__init__.py",
        "app/core/config.py",
        "app/core/database.py",
        "app/core/cache.py",
        "app/core/monitoring.py",
        "app/core/security.py",
        "app/api/v1/endpoints/performance.py",
        "app/models/user.py",
        "app/services/user.py"
    ]
    
    missing_files = []
    for file_path in required_files:
        full_path = backend_path / file_path
        if full_path.exists():
            print(f"✅ {file_path}")
        else:
            print(f"❌ {file_path}")
            missing_files.append(file_path)
    
    return len(missing_files) == 0

def test_backend_imports():
    """Test backend imports"""
    print("\n🔧 Testing Backend Imports...")
    
    # Change to backend directory
    original_cwd = os.getcwd()
    try:
        os.chdir("backend")
        
        # Run the import test script
        success, stdout, stderr = run_command("python test_imports.py")
        
        if success:
            print("✅ Backend imports successful")
            if stdout:
                print(stdout)
            return True
        else:
            print("❌ Backend imports failed")
            if stderr:
                print(f"Error: {stderr}")
            return False
            
    finally:
        os.chdir(original_cwd)

def test_frontend_structure():
    """Test frontend file structure"""
    print("\n📁 Testing Frontend Structure...")
    
    frontend_path = Path("frontend")
    if not frontend_path.exists():
        print("❌ Frontend directory not found")
        return False
    
    required_files = [
        "package.json",
        "webpack.config.js",
        "src/utils/performance.ts",
        "src/components/LazyImage.tsx",
        "public/sw.js",
        "scripts/performance-test.js"
    ]
    
    missing_files = []
    for file_path in required_files:
        full_path = frontend_path / file_path
        if full_path.exists():
            print(f"✅ {file_path}")
        else:
            print(f"❌ {file_path}")
            missing_files.append(file_path)
    
    return len(missing_files) == 0

def test_frontend_setup():
    """Test frontend setup"""
    print("\n⚛️  Testing Frontend Setup...")
    
    # Check if Node.js is available
    success, stdout, stderr = run_command("node --version")
    if not success:
        print("❌ Node.js not found")
        return False
    
    print(f"✅ Node.js {stdout.strip()}")
    
    # Check if npm is available
    success, stdout, stderr = run_command("npm --version")
    if not success:
        print("❌ npm not found")
        return False
    
    print(f"✅ npm {stdout.strip()}")
    
    # Run frontend test script
    original_cwd = os.getcwd()
    try:
        os.chdir("frontend")
        
        success, stdout, stderr = run_command("node test-setup.js")
        
        if success:
            print("✅ Frontend setup test passed")
            return True
        else:
            print("❌ Frontend setup test failed")
            if stderr:
                print(f"Error: {stderr}")
            return False
            
    finally:
        os.chdir(original_cwd)

def test_database_connection():
    """Test database connection"""
    print("\n🗄️  Testing Database Connection...")
    
    try:
        # Try to import and test database connection
        sys.path.append("backend")
        from app.core.config import get_settings
        from app.core.database import engine
        
        settings = get_settings()
        
        # Test connection
        with engine.connect() as conn:
            result = conn.execute("SELECT 1")
            if result.fetchone():
                print("✅ Database connection successful")
                return True
        
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        print("💡 Make sure PostgreSQL is running and configured correctly")
        return False

def test_redis_connection():
    """Test Redis connection"""
    print("\n🔴 Testing Redis Connection...")
    
    try:
        import redis
        from backend.app.core.config import get_settings
        
        settings = get_settings()
        client = redis.from_url(settings.REDIS_URL)
        client.ping()
        
        print("✅ Redis connection successful")
        return True
        
    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
        print("💡 Make sure Redis is running and configured correctly")
        return False

def test_performance_endpoints():
    """Test performance monitoring endpoints"""
    print("\n📊 Testing Performance Endpoints...")
    
    try:
        # Import and test performance endpoints
        sys.path.append("backend")
        from app.api.v1.endpoints.performance import router
        from app.core.monitoring import performance_monitor, health_checker
        from app.core.cache import cache_manager
        
        print("✅ Performance endpoints imported successfully")
        print("✅ Performance monitor available")
        print("✅ Health checker available")
        print("✅ Cache manager available")
        
        return True
        
    except Exception as e:
        print(f"❌ Performance endpoints test failed: {e}")
        return False

def generate_test_report(results):
    """Generate a comprehensive test report"""
    print("\n" + "=" * 60)
    print("📋 COMPREHENSIVE TEST REPORT")
    print("=" * 60)
    
    total_tests = len(results)
    passed_tests = sum(1 for result in results.values() if result)
    
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} - {test_name}")
    
    print(f"\n🎯 Overall Score: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("🎉 ALL TESTS PASSED! The platform is ready for deployment.")
        print("\n🚀 Next Steps:")
        print("1. Start the backend: cd backend && python main.py")
        print("2. Start the frontend: cd frontend && npm start")
        print("3. Access the application at http://localhost:3000")
        return True
    else:
        print("⚠️  SOME TESTS FAILED. Please fix the issues before proceeding.")
        print("\n🔧 Troubleshooting:")
        
        if not results.get("Python Environment"):
            print("- Install Python 3.8+ and required dependencies")
        if not results.get("Backend Structure"):
            print("- Check backend file structure and missing files")
        if not results.get("Backend Imports"):
            print("- Install backend dependencies: pip install -r backend/requirements.txt")
        if not results.get("Frontend Structure"):
            print("- Check frontend file structure and missing files")
        if not results.get("Frontend Setup"):
            print("- Install frontend dependencies: cd frontend && npm install")
        if not results.get("Database Connection"):
            print("- Start PostgreSQL and check connection settings")
        if not results.get("Redis Connection"):
            print("- Start Redis server and check connection settings")
        
        return False

def main():
    """Run all tests"""
    print("🧪 MANUFACTURING PLATFORM COMPREHENSIVE TEST SUITE")
    print("=" * 60)
    print("Testing all components for production readiness...")
    
    # Define all tests
    tests = [
        ("Python Environment", test_python_environment),
        ("Backend Structure", test_backend_structure),
        ("Backend Imports", test_backend_imports),
        ("Frontend Structure", test_frontend_structure),
        ("Frontend Setup", test_frontend_setup),
        ("Database Connection", test_database_connection),
        ("Redis Connection", test_redis_connection),
        ("Performance Endpoints", test_performance_endpoints),
    ]
    
    results = {}
    
    # Run all tests
    for test_name, test_func in tests:
        try:
            result = test_func()
            results[test_name] = result
        except Exception as e:
            print(f"❌ {test_name} crashed: {e}")
            results[test_name] = False
    
    # Generate report
    success = generate_test_report(results)
    
    return 0 if success else 1

if __name__ == "__main__":
    exit(main()) 
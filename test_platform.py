#!/usr/bin/env python3
"""
Comprehensive test runner for the Manufacturing Platform
Tests both backend and frontend components
"""

import os
import sys
import subprocess
from pathlib import Path

def test_python_environment():
    """Test Python environment and basic dependencies"""
    print("🐍 Testing Python Environment...")
    
    # Check Python version
    if sys.version_info < (3, 8):
        print(f"❌ Python 3.8+ required, found {sys.version}")
        return False
    
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}")
    return True

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
    
    try:
        # Add backend to path
        sys.path.insert(0, "backend")
        
        # Test core imports
        from app.core.config import get_settings
        print("✅ Config import successful")
        
        from app.core.database import get_db, db_optimizer
        print("✅ Database import successful")
        
        from app.core.cache import cache_manager
        print("✅ Cache import successful")
        
        from app.core.monitoring import performance_monitor, health_checker
        print("✅ Monitoring import successful")
        
        from app.core.security import TokenManager, PasswordValidator
        print("✅ Security import successful")
        
        return True
    except Exception as e:
        print(f"❌ Backend imports failed: {e}")
        return False

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
#!/usr/bin/env python3
"""
Simple test script to check if all imports are working correctly
"""

def test_basic_imports():
    """Test basic Python imports"""
    try:
        import sys
        import os
        print(f"✅ Python version: {sys.version}")
        print(f"✅ Current directory: {os.getcwd()}")
        return True
    except Exception as e:
        print(f"❌ Basic imports failed: {e}")
        return False

def test_app_imports():
    """Test application imports"""
    try:
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
        print(f"❌ App imports failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_model_imports():
    """Test model imports"""
    try:
        from app.models.user import User
        print("✅ User model import successful")
        
        return True
    except Exception as e:
        print(f"❌ Model imports failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_api_imports():
    """Test API imports"""
    try:
        from app.api.v1.endpoints.performance import router
        print("✅ Performance API import successful")
        
        from main import app
        print("✅ Main app import successful")
        
        return True
    except Exception as e:
        print(f"❌ API imports failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_dependencies():
    """Test external dependencies"""
    try:
        import fastapi
        print(f"✅ FastAPI version: {fastapi.__version__}")
        
        import sqlalchemy
        print(f"✅ SQLAlchemy version: {sqlalchemy.__version__}")
        
        import redis
        print("✅ Redis client available")
        
        import psutil
        print("✅ psutil available")
        
        return True
    except Exception as e:
        print(f"❌ Dependencies failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all tests"""
    print("🧪 Testing Manufacturing Platform Imports")
    print("=" * 50)
    
    tests = [
        ("Basic Imports", test_basic_imports),
        ("Dependencies", test_dependencies),
        ("App Core Imports", test_app_imports),
        ("Model Imports", test_model_imports),
        ("API Imports", test_api_imports),
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n📋 Testing {test_name}...")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} crashed: {e}")
            results.append((test_name, False))
    
    print("\n" + "=" * 50)
    print("📊 Test Results Summary:")
    print("=" * 50)
    
    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
        if result:
            passed += 1
    
    print(f"\n🎯 Overall: {passed}/{len(results)} tests passed")
    
    if passed == len(results):
        print("🎉 All tests passed! The application should be ready to run.")
        return 0
    else:
        print("⚠️  Some tests failed. Please fix the issues before running the application.")
        return 1

if __name__ == "__main__":
    exit(main()) 
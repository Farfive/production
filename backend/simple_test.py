#!/usr/bin/env python3
"""
Simple test script to identify specific errors
"""

import sys
import traceback

def test_basic_imports():
    """Test basic Python functionality"""
    print("Testing basic Python imports...")
    try:
        import os
        import json
        import datetime
        print("✅ Basic imports successful")
        return True
    except Exception as e:
        print(f"❌ Basic imports failed: {e}")
        return False

def test_config_import():
    """Test config import"""
    print("\nTesting config import...")
    try:
        from app.core.config import get_settings
        settings = get_settings()
        print(f"✅ Config imported successfully - Environment: {settings.ENVIRONMENT}")
        return True
    except Exception as e:
        print(f"❌ Config import failed: {e}")
        traceback.print_exc()
        return False

def test_database_import():
    """Test database import"""
    print("\nTesting database import...")
    try:
        from app.core.database import get_db, db_optimizer, create_tables
        print("✅ Database imports successful")
        return True
    except Exception as e:
        print(f"❌ Database import failed: {e}")
        traceback.print_exc()
        return False

def test_cache_import():
    """Test cache import"""
    print("\nTesting cache import...")
    try:
        from app.core.cache import cache_manager
        print("✅ Cache import successful")
        return True
    except Exception as e:
        print(f"❌ Cache import failed: {e}")
        traceback.print_exc()
        return False

def test_monitoring_import():
    """Test monitoring import"""
    print("\nTesting monitoring import...")
    try:
        from app.core.monitoring import performance_monitor, health_checker
        print("✅ Monitoring imports successful")
        return True
    except Exception as e:
        print(f"❌ Monitoring import failed: {e}")
        traceback.print_exc()
        return False

def test_security_import():
    """Test security import"""
    print("\nTesting security import...")
    try:
        from app.core.security import TokenManager, PasswordValidator
        print("✅ Security imports successful")
        return True
    except Exception as e:
        print(f"❌ Security import failed: {e}")
        traceback.print_exc()
        return False

def test_main_app_import():
    """Test main app import"""
    print("\nTesting main app import...")
    try:
        from main import app
        print("✅ Main app import successful")
        return True
    except Exception as e:
        print(f"❌ Main app import failed: {e}")
        traceback.print_exc()
        return False

def test_performance_api_import():
    """Test performance API import"""
    print("\nTesting performance API import...")
    try:
        from app.api.v1.endpoints.performance import router
        print("✅ Performance API import successful")
        return True
    except Exception as e:
        print(f"❌ Performance API import failed: {e}")
        traceback.print_exc()
        return False

def main():
    """Run all tests"""
    print("🔍 SIMPLE ERROR DETECTION TEST")
    print("=" * 40)
    
    tests = [
        test_basic_imports,
        test_config_import,
        test_database_import,
        test_cache_import,
        test_monitoring_import,
        test_security_import,
        test_performance_api_import,
        test_main_app_import,
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"❌ Test {test.__name__} crashed: {e}")
            traceback.print_exc()
    
    print("\n" + "=" * 40)
    print(f"📊 Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All imports working correctly!")
    else:
        print("⚠️  Some imports failed - check errors above")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 
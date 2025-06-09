#!/usr/bin/env python3
"""
Quick import test for backend modules
"""

import sys
import os
import traceback

def test_backend_imports():
    """Test backend module imports"""
    print("🔍 Testing Backend Module Imports")
    print("=" * 40)
    
    # Change to backend directory
    original_path = sys.path.copy()
    backend_path = os.path.join(os.getcwd(), "backend")
    
    if os.path.exists(backend_path):
        sys.path.insert(0, backend_path)
        os.chdir(backend_path)
        print(f"✅ Changed to backend directory: {backend_path}")
    else:
        print("❌ Backend directory not found")
        return False
    
    tests = []
    
    # Test 1: Core modules
    try:
        from app.core.config import settings, get_settings
        print("✅ Config module imported successfully")
        tests.append(("Config", True))
    except Exception as e:
        print(f"❌ Config import failed: {e}")
        tests.append(("Config", False))
        traceback.print_exc()
    
    # Test 2: Database module
    try:
        from app.core.database import get_db, create_tables
        print("✅ Database module imported successfully")
        tests.append(("Database", True))
    except Exception as e:
        print(f"❌ Database import failed: {e}")
        tests.append(("Database", False))
        traceback.print_exc()
    
    # Test 3: Security module
    try:
        from app.core.security import create_access_token, verify_password
        print("✅ Security module imported successfully")
        tests.append(("Security", True))
    except Exception as e:
        print(f"❌ Security import failed: {e}")
        tests.append(("Security", False))
        traceback.print_exc()
    
    # Test 4: User model
    try:
        from app.models.user import User, UserRole
        print("✅ User model imported successfully")
        tests.append(("User Model", True))
    except Exception as e:
        print(f"❌ User model import failed: {e}")
        tests.append(("User Model", False))
        traceback.print_exc()
    
    # Test 5: Auth endpoint
    try:
        from app.api.v1.endpoints.auth import router
        print("✅ Auth endpoint imported successfully")
        tests.append(("Auth Endpoint", True))
    except Exception as e:
        print(f"❌ Auth endpoint import failed: {e}")
        tests.append(("Auth Endpoint", False))
        traceback.print_exc()
    
    # Test 6: Main application
    try:
        import main
        print("✅ Main application imported successfully")
        tests.append(("Main App", True))
    except Exception as e:
        print(f"❌ Main application import failed: {e}")
        tests.append(("Main App", False))
        traceback.print_exc()
    
    # Restore original path
    sys.path = original_path
    os.chdir("..")
    
    # Summary
    print("\n" + "=" * 40)
    print("📊 IMPORT TEST SUMMARY")
    print("=" * 40)
    
    passed = 0
    total = len(tests)
    
    for test_name, success in tests:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{test_name}: {status}")
        if success:
            passed += 1
    
    print(f"\nResult: {passed}/{total} imports successful")
    
    if passed == total:
        print("🎉 All imports working correctly!")
        return True
    else:
        print("⚠️ Some imports failed. Check errors above.")
        return False

if __name__ == "__main__":
    test_backend_imports() 
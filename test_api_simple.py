#!/usr/bin/env python3
"""
Simple API test to validate backend functionality
"""

import sys
import json
import time
from urllib.request import urlopen, Request, HTTPError
from urllib.parse import urlencode

BASE_URL = "http://localhost:8000"

def test_basic_endpoints():
    """Test basic endpoints to ensure server is running"""
    print("=== BASIC ENDPOINT TESTS ===")
    
    # Test root endpoint
    try:
        response = urlopen(f"{BASE_URL}/", timeout=10)
        data = json.loads(response.read().decode())
        print(f"✅ Root endpoint: {response.code}")
        print(f"   Message: {data.get('message', 'N/A')}")
    except Exception as e:
        print(f"❌ Root endpoint failed: {e}")
        return False
    
    # Test health endpoint
    try:
        response = urlopen(f"{BASE_URL}/health", timeout=10)
        data = json.loads(response.read().decode())
        print(f"✅ Health endpoint: {response.code}")
        print(f"   Status: {data.get('status', 'N/A')}")
    except Exception as e:
        print(f"❌ Health endpoint failed: {e}")
        return False
    
    # Test docs endpoint
    try:
        response = urlopen(f"{BASE_URL}/docs", timeout=10)
        print(f"✅ Docs endpoint: {response.code}")
    except Exception as e:
        print(f"❌ Docs endpoint failed: {e}")
        return False
    
    return True

def test_user_registration():
    """Test user registration"""
    print("\n=== USER REGISTRATION TEST ===")
    
    user_data = {
        'email': 'test_user@example.com',
        'password': 'TestPassword123!',
        'first_name': 'Test',
        'last_name': 'User',
        'role': 'client',
        'data_processing_consent': True
    }
    
    try:
        data = json.dumps(user_data).encode('utf-8')
        request = Request(
            f"{BASE_URL}/api/v1/auth/register",
            data=data,
            headers={'Content-Type': 'application/json'}
        )
        
        response = urlopen(request, timeout=10)
        result = json.loads(response.read().decode())
        
        print(f"✅ Registration successful: {response.code}")
        print(f"   User ID: {result.get('id', 'N/A')}")
        print(f"   Email: {result.get('email', 'N/A')}")
        return True, result
        
    except HTTPError as e:
        error_data = json.loads(e.read().decode())
        print(f"❌ Registration failed: {e.code}")
        print(f"   Error: {error_data}")
        return False, None
    except Exception as e:
        print(f"❌ Registration error: {e}")
        return False, None

def test_user_login(email="test_user@example.com", password="TestPassword123!"):
    """Test user login"""
    print("\n=== USER LOGIN TEST ===")
    
    login_data = {
        'email': email,
        'password': password
    }
    
    try:
        data = json.dumps(login_data).encode('utf-8')
        request = Request(
            f"{BASE_URL}/api/v1/auth/login-json",
            data=data,
            headers={'Content-Type': 'application/json'}
        )
        
        response = urlopen(request, timeout=10)
        result = json.loads(response.read().decode())
        
        print(f"✅ Login successful: {response.code}")
        print(f"   Token type: {result.get('token_type', 'N/A')}")
        print(f"   Expires in: {result.get('expires_in', 'N/A')} seconds")
        
        return True, result.get('access_token')
        
    except HTTPError as e:
        error_data = json.loads(e.read().decode())
        print(f"❌ Login failed: {e.code}")
        print(f"   Error: {error_data}")
        return False, None
    except Exception as e:
        print(f"❌ Login error: {e}")
        return False, None

def test_protected_endpoint(token):
    """Test protected endpoint with authentication"""
    print("\n=== PROTECTED ENDPOINT TEST ===")
    
    if not token:
        print("❌ No token available for protected endpoint test")
        return False
    
    try:
        request = Request(
            f"{BASE_URL}/api/v1/orders/",
            headers={'Authorization': f'Bearer {token}'}
        )
        
        response = urlopen(request, timeout=10)
        result = json.loads(response.read().decode())
        
        print(f"✅ Orders endpoint accessible: {response.code}")
        print(f"   Total orders: {result.get('total', 0)}")
        print(f"   Page: {result.get('page', 'N/A')}")
        
        return True
        
    except HTTPError as e:
        error_data = json.loads(e.read().decode())
        print(f"❌ Protected endpoint failed: {e.code}")
        print(f"   Error: {error_data}")
        return False
    except Exception as e:
        print(f"❌ Protected endpoint error: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 Manufacturing Platform API Tests")
    print("=" * 50)
    
    results = {}
    
    # Test basic endpoints
    results['basic_endpoints'] = test_basic_endpoints()
    
    if not results['basic_endpoints']:
        print("\n❌ Basic endpoints failed. Server may not be running.")
        print("Please start the server with: cd backend && python main.py")
        return
    
    # Test registration
    reg_success, user_data = test_user_registration()
    results['registration'] = reg_success
    
    # Test login (try with newly created user or fallback)
    login_success, token = test_user_login()
    results['login'] = login_success
    
    # Test protected endpoint
    results['protected_endpoint'] = test_protected_endpoint(token)
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 50)
    
    for test_name, success in results.items():
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{test_name.replace('_', ' ').title()}: {status}")
    
    total_tests = len(results)
    passed_tests = sum(results.values())
    
    print(f"\nOverall: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("🎉 All tests passed! Platform is working correctly.")
    else:
        print("⚠️  Some tests failed. Please check the errors above.")

if __name__ == "__main__":
    main() 
#!/usr/bin/env python3
"""
Simple Authentication Test
==========================

Test basic authentication functionality to verify the auth system is working.
"""

import requests
import json
import time
from datetime import datetime

BASE_URL = "http://localhost:8000"

def test_password_strength():
    """Test password strength endpoint"""
    print("🔒 Testing Password Strength...")
    
    url = f"{BASE_URL}/api/v1/auth/check-password-strength"
    
    # Test strong password
    response = requests.post(url, json={"password": "StrongPassword123!"})
    if response.status_code == 200:
        result = response.json()
        if result.get("is_strong"):
            print("✅ Strong password correctly identified")
        else:
            print("❌ Strong password incorrectly flagged as weak")
            return False
    else:
        print(f"❌ Password strength API failed: {response.status_code}")
        return False
    
    # Test weak password
    response = requests.post(url, json={"password": "weak"})
    if response.status_code == 200:
        result = response.json()
        if not result.get("is_strong"):
            print("✅ Weak password correctly identified")
        else:
            print("❌ Weak password incorrectly flagged as strong")
            return False
    else:
        print(f"❌ Password strength API failed: {response.status_code}")
        return False
    
    return True

def test_user_registration():
    """Test user registration"""
    print("\n👤 Testing User Registration...")
    
    timestamp = int(time.time())
    email = f"test_user_{timestamp}@example.com"
    
    registration_data = {
        "email": email,
        "password": "TestPassword123!",
        "first_name": "Test",
        "last_name": "User",
        "role": "client",
        "company_name": "Test Company",
        "data_processing_consent": True,
        "marketing_consent": False
    }
    
    url = f"{BASE_URL}/api/v1/auth/register"
    response = requests.post(url, json=registration_data)
    
    if response.status_code == 200:
        user_data = response.json()
        print(f"✅ User registered successfully: {email}")
        return email, user_data
    else:
        print(f"❌ Registration failed: {response.status_code} - {response.text}")
        return None, None

def test_user_login(email, password="TestPassword123!"):
    """Test user login"""
    print("\n🔐 Testing User Login...")
    
    login_data = {
        "email": email,
        "password": password
    }
    
    url = f"{BASE_URL}/api/v1/auth/login-json"
    response = requests.post(url, json=login_data)
    
    if response.status_code == 200:
        token_data = response.json()
        access_token = token_data.get("access_token")
        print(f"✅ User logged in successfully")
        return access_token
    else:
        print(f"❌ Login failed: {response.status_code} - {response.text}")
        return None

def test_authenticated_request(access_token):
    """Test authenticated API request"""
    print("\n🔑 Testing Authenticated Request...")
    
    headers = {"Authorization": f"Bearer {access_token}"}
    url = f"{BASE_URL}/api/v1/auth/me"
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        profile = response.json()
        print(f"✅ Authenticated request successful: {profile.get('email')}")
        return True
    else:
        print(f"❌ Authenticated request failed: {response.status_code} - {response.text}")
        return False

def test_invalid_token():
    """Test invalid token handling"""
    print("\n🚨 Testing Invalid Token Handling...")
    
    headers = {"Authorization": "Bearer invalid_token"}
    url = f"{BASE_URL}/api/v1/auth/me"
    response = requests.get(url, headers=headers)
    
    if response.status_code == 401:
        print("✅ Invalid token correctly rejected")
        return True
    else:
        print(f"❌ Invalid token not properly handled: {response.status_code}")
        return False

def main():
    """Run all authentication tests"""
    print("🏭 Manufacturing Platform - Simple Authentication Test")
    print("=" * 60)
    
    results = []
    
    # Test password strength
    results.append(("Password Strength", test_password_strength()))
    
    # Test user registration
    email, user_data = test_user_registration()
    if email:
        results.append(("User Registration", True))
        
        # Test user login
        access_token = test_user_login(email)
        if access_token:
            results.append(("User Login", True))
            
            # Test authenticated request
            results.append(("Authenticated Request", test_authenticated_request(access_token)))
        else:
            results.append(("User Login", False))
            results.append(("Authenticated Request", False))
    else:
        results.append(("User Registration", False))
        results.append(("User Login", False))
        results.append(("Authenticated Request", False))
    
    # Test invalid token
    results.append(("Invalid Token Handling", test_invalid_token()))
    
    # Print results
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status} - {test_name}")
        if result:
            passed += 1
    
    success_rate = (passed / total) * 100
    print(f"\n📈 Success Rate: {passed}/{total} ({success_rate:.1f}%)")
    
    if passed == total:
        print("\n🎉 ALL AUTHENTICATION TESTS PASSED!")
        print("The authentication system is working correctly.")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed.")
        print("Please review the authentication system.")

if __name__ == "__main__":
    main() 
#!/usr/bin/env python3
"""
Simple Authentication Test Script
Tests basic authentication functionality after database fixes
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"
API_URL = f"{BASE_URL}/api/v1"

print("🧪 MANUFACTURING PLATFORM - AUTHENTICATION TEST")
print("=" * 60)

def test_health():
    """Test basic health endpoint"""
    print("📋 Testing Health Endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Health Check: {data['status']}")
            return True
        else:
            print(f"   ❌ Health Check Failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Health Check Error: {e}")
        return False

def test_user_registration():
    """Test user registration"""
    print("\n👤 Testing User Registration...")
    
    # Create unique test user
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    user_data = {
        "email": f"testuser_{timestamp}@example.com",
        "password": "TestPassword123!",
        "first_name": "John",
        "last_name": "Doe",
        "company_name": "Test Company Ltd",
        "nip": "1234567890",
        "phone": "+48123456789",
        "company_address": "Test Street 123, Warsaw, Poland",
        "role": "client",
        "data_processing_consent": True,
        "marketing_consent": False
    }
    
    try:
        response = requests.post(
            f"{API_URL}/auth/register",
            json=user_data,
            timeout=10
        )
        
        if response.status_code in [200, 201]:
            user = response.json()
            print(f"   ✅ Registration Successful:")
            print(f"      User ID: {user['id']}")
            print(f"      Email: {user['email']}")
            print(f"      Role: {user['role']}")
            return user
        else:
            print(f"   ❌ Registration Failed: {response.status_code}")
            try:
                error_detail = response.json()
                print(f"      Error: {error_detail}")
            except:
                print(f"      Error: {response.text}")
            return None
            
    except Exception as e:
        print(f"   ❌ Registration Error: {e}")
        return None

def test_user_login(email, password):
    """Test user login"""
    print("\n🔐 Testing User Login...")
    
    login_data = {
        "username": email,
        "password": password
    }
    
    try:
        response = requests.post(
            f"{API_URL}/auth/login",
            data=login_data,  # form data for OAuth2
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=10
        )
        
        if response.status_code == 200:
            token_data = response.json()
            print(f"   ✅ Login Successful:")
            print(f"      Token Type: {token_data['token_type']}")
            print(f"      Access Token: {token_data['access_token'][:20]}...")
            return token_data["access_token"]
        else:
            print(f"   ❌ Login Failed: {response.status_code}")
            try:
                error_detail = response.json()
                print(f"      Error: {error_detail}")
            except:
                print(f"      Error: {response.text}")
            return None
            
    except Exception as e:
        print(f"   ❌ Login Error: {e}")
        return None

def test_authenticated_request(token):
    """Test making authenticated requests"""
    print("\n🛡️ Testing Authenticated Request...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(
            f"{API_URL}/auth/me",
            headers=headers,
            timeout=5
        )
        
        if response.status_code == 200:
            user_data = response.json()
            print(f"   ✅ Authenticated Request Successful:")
            print(f"      User: {user_data['email']}")
            print(f"      Role: {user_data['role']}")
            print(f"      Active: {user_data['is_active']}")
            return True
        else:
            print(f"   ❌ Authenticated Request Failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"   ❌ Authenticated Request Error: {e}")
        return False

# Run the tests
def main():
    success_count = 0
    total_tests = 4
    
    # Test 1: Health Check
    if test_health():
        success_count += 1
    
    # Test 2: Client Registration
    client_user = test_user_registration()
    if client_user:
        success_count += 1
        
        # Test 3: Client Login
        token = test_user_login(client_user["email"], "TestPassword123!")
        if token:
            success_count += 1
            
            # Test 4: Authenticated Request
            if test_authenticated_request(token):
                success_count += 1
    
    # Results
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)
    print(f"Tests Passed: {success_count}/{total_tests}")
    print(f"Success Rate: {(success_count/total_tests)*100:.1f}%")
    
    if success_count == total_tests:
        print("🎉 ALL AUTHENTICATION TESTS PASSED!")
        print("✅ Database schema fixes successful")
        print("✅ User registration working")
        print("✅ Authentication system operational")
        print("✅ JWT token generation working")
    else:
        print("⚠️  Some tests failed - need to investigate further")
    
    print("=" * 60)

if __name__ == "__main__":
    main() 
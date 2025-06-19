#!/usr/bin/env python3
"""
Test the fixed registration endpoint
"""

import requests
import json
import time
from datetime import datetime

def print_status(message, level="INFO"):
    timestamp = datetime.now().strftime('%H:%M:%S')
    print(f"{timestamp} [{level}] {message}")

def test_fixed_registration():
    """Test the registration endpoint with improved error handling"""
    print("TESTING FIXED REGISTRATION ENDPOINT")
    print("="*50)
    
    base_url = "http://127.0.0.1:8000"
    
    # Test data
    user_data = {
        "email": "fixed.test@example.com",
        "password": "SecurePass123!",
        "first_name": "Fixed",
        "last_name": "Test",
        "company_name": "Fixed Test Corp",
        "role": "client",
        "data_processing_consent": True,
        "marketing_consent": False
    }
    
    # 1. Test health first
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        print_status(f"Health check: {response.status_code}")
        if response.status_code != 200:
            print_status("Server not healthy, cannot proceed", "ERROR")
            return False
    except Exception as e:
        print_status(f"Cannot connect to server: {e}", "ERROR")
        return False
    
    # 2. Test registration
    try:
        print_status("Testing registration...")
        response = requests.post(
            f"{base_url}/api/v1/auth/register",
            json=user_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        print_status(f"Registration status: {response.status_code}")
        print_status(f"Response headers: {dict(response.headers)}")
        print_status(f"Response length: {len(response.content)} bytes")
        
        if response.content:
            print_status(f"Response text: {response.text[:300]}")
            
            try:
                json_response = response.json()
                print_status("✅ Got valid JSON response!", "SUCCESS")
                print_status(f"Response data: {json.dumps(json_response, indent=2)[:400]}")
                
                if response.status_code in [200, 201]:
                    print_status("✅ Registration successful!", "SUCCESS")
                    return True
                elif response.status_code == 409:
                    print_status("User already exists (this is expected for repeat tests)", "WARNING")
                    return True
                else:
                    print_status(f"Registration failed with status {response.status_code}", "ERROR")
                    return False
                    
            except json.JSONDecodeError as e:
                print_status(f"❌ JSON decode error: {e}", "ERROR")
                print_status("This means the endpoint is returning non-JSON data", "ERROR")
                return False
        else:
            print_status("❌ Empty response received", "ERROR")
            return False
            
    except Exception as e:
        print_status(f"❌ Request error: {e}", "ERROR")
        return False

def test_login():
    """Test login with the user we just created"""
    print_status("Testing login...")
    
    base_url = "http://127.0.0.1:8000"
    login_data = {
        "email": "fixed.test@example.com",
        "password": "SecurePass123!"
    }
    
    try:
        response = requests.post(
            f"{base_url}/api/v1/auth/login-json",
            json=login_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        print_status(f"Login status: {response.status_code}")
        
        if response.content and response.status_code == 200:
            try:
                json_response = response.json()
                print_status("✅ Login successful!", "SUCCESS")
                access_token = json_response.get('access_token')
                if access_token:
                    print_status("✅ Got access token!", "SUCCESS")
                    return True
            except json.JSONDecodeError:
                print_status("❌ Login response not JSON", "ERROR")
        else:
            print_status(f"Login failed: {response.status_code} - {response.text[:200]}", "ERROR")
        
        return False
        
    except Exception as e:
        print_status(f"❌ Login error: {e}", "ERROR")
        return False

def main():
    print("FIXED REGISTRATION TEST")
    print("="*50)
    print("Email verification: DISABLED")
    print("Enhanced error handling: ENABLED")
    print("="*50)
    
    # Test registration
    reg_success = test_fixed_registration()
    
    # If registration works, test login
    if reg_success:
        time.sleep(1)  # Brief pause
        login_success = test_login()
        
        print("\n" + "="*50)
        print("FINAL RESULTS")
        print("="*50)
        
        if reg_success and login_success:
            print_status("✅ ALL TESTS PASSED!", "SUCCESS")
            print_status("✅ Registration endpoint working", "SUCCESS") 
            print_status("✅ Login endpoint working", "SUCCESS")
            print_status("✅ Email verification bypassed", "SUCCESS")
            return True
        else:
            print_status("❌ Some tests failed", "ERROR")
            return False
    else:
        print_status("❌ Registration failed, cannot test login", "ERROR")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1) 
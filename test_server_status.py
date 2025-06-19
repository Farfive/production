#!/usr/bin/env python3

import requests
import time
import json

def test_server_status():
    """Test if server is running and responsive"""
    print("🔍 Testing server status...")
    
    # Wait for server startup
    time.sleep(5)
    
    try:
        # Test health endpoint
        response = requests.get("http://127.0.0.1:8000/health", timeout=10)
        if response.status_code == 200:
            print("✅ Server is running and healthy!")
            return True
        else:
            print(f"❌ Server returned status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Server is not running or not responding")
        return False
    except Exception as e:
        print(f"❌ Error testing server: {e}")
        return False

def test_registration():
    """Test registration endpoint"""
    print("🧪 Testing registration endpoint...")
    
    test_user = {
        "email": f"test_{int(time.time())}@example.com",
        "password": "TestPassword123!",
        "first_name": "Test",
        "last_name": "User",
        "role": "client",
        "company_name": "Test Company",
        "phone": "+48123456789",
        "data_processing_consent": True
    }
    
    try:
        response = requests.post(
            "http://127.0.0.1:8000/api/v1/auth/register",
            json=test_user,
            timeout=15
        )
        
        print(f"Registration response status: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Registration successful!")
            data = response.json()
            print(f"User ID: {data.get('id')}")
            print(f"Email: {data.get('email')}")
            return True
        else:
            print(f"❌ Registration failed with status {response.status_code}")
            try:
                error_data = response.json()
                print(f"Error: {error_data}")
            except:
                print(f"Response text: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Registration test failed: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Server Status Test")
    print("=" * 50)
    
    if test_server_status():
        test_registration()
    
    print("\n📊 Test completed!") 
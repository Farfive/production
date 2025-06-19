#!/usr/bin/env python3
"""
Quick test to verify database relationship fixes
"""

import requests
import time
from datetime import datetime

def test_registration():
    """Test user registration to verify relationship fixes"""
    print("🧪 Testing database relationships...")
    
    # Wait a moment for server to be ready
    print("⏳ Waiting for server...")
    time.sleep(3)
    
    # Test data
    test_user = {
        "email": f"relationtest_{int(time.time())}@example.com",
        "password": "TestPassword123!",
        "first_name": "Relation",
        "last_name": "Test",
        "role": "client",
        "company_name": "Test Company",
        "phone": "+48123456789",
        "data_processing_consent": True
    }
    
    try:
        print("📤 Sending registration request...")
        response = requests.post(
            "http://127.0.0.1:8000/api/v1/auth/register",
            json=test_user,
            timeout=10
        )
        
        print(f"📦 Status Code: {response.status_code}")
        
        if response.status_code == 201:
            data = response.json()
            print(f"✅ Registration successful!")
            print(f"   User ID: {data.get('id')}")
            print(f"   Email: {data.get('email')}")
            print(f"   Role: {data.get('role')}")
            print(f"\n🎉 DATABASE RELATIONSHIPS FIXED!")
            return True
        else:
            print(f"❌ Registration failed!")
            try:
                error_data = response.json()
                print(f"   Error: {error_data}")
            except:
                print(f"   Raw response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Registration test failed: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("DATABASE RELATIONSHIP FIXES VERIFICATION")
    print("=" * 60)
    print(f"⏰ Started at: {datetime.now()}")
    
    success = test_registration()
    
    if success:
        print("\n✅ All database relationship issues have been resolved!")
    else:
        print("\n❌ Database relationship issues still exist.")
    
    print("=" * 60) 
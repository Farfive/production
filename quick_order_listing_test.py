#!/usr/bin/env python3

import requests
import json

def test_with_existing_user():
    """Test order listing with existing user credentials"""
    print("🧪 QUICK ORDER LISTING TEST")
    print("=" * 40)
    
    # Use credentials from our successful order creation test
    login_data = {
        "username": "order_test_20250608_214503@example.com",  # From successful test
        "password": "TestPassword123!"
    }
    
    try:
        # Login
        response = requests.post("http://localhost:8000/api/v1/auth/login", data=login_data)
        if response.status_code == 200:
            token = response.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
            print("✅ Login successful")
            
            # Test order listing
            print("🔍 Testing order listing...")
            response = requests.get("http://localhost:8000/api/v1/orders/", headers=headers)
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ SUCCESS! Orders: {len(data.get('orders', []))}")
                return True
            else:
                print(f"❌ FAILED: {response.text}")
                return False
        else:
            print(f"❌ Login failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Exception: {e}")
        return False

if __name__ == "__main__":
    test_with_existing_user() 
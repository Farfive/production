#!/usr/bin/env python3

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

def test_order_listing():
    """Test order listing specifically"""
    
    print("🧪 ORDER LISTING DEBUG TEST")
    print("=" * 50)
    
    # First, create and login a user
    user_data = {
        "email": f"listing_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}@example.com",
        "password": "TestPassword123!",
        "first_name": "Test",
        "last_name": "User",
        "company_name": "Test Company",
        "nip": "1234567890",
        "company_address": "Test Address 123",
        "phone": "+48123456789",
        "role": "client",
        "data_processing_consent": True,
        "marketing_consent": False
    }
    
    # Register user
    response = requests.post(f"{BASE_URL}/api/v1/auth/register", json=user_data)
    if response.status_code == 200:
        user_id = response.json()["user"]["id"]
        print(f"✅ User created: {user_data['email']} (ID: {user_id})")
        
        # Activate user directly via database approach
        import sqlite3
        conn = sqlite3.connect('backend/manufacturing_platform.db')
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET registration_status = 'ACTIVE', email_verified = 1 WHERE id = ?", (user_id,))
        conn.commit()
        conn.close()
        print("✅ User activated")
    else:
        print(f"❌ Failed to create user: {response.text}")
        return
    
    # Login
    login_data = {
        "username": user_data["email"], 
        "password": "TestPassword123!"
    }
    
    response = requests.post(f"{BASE_URL}/api/v1/auth/login", data=login_data)
    if response.status_code == 200:
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("✅ Login successful")
    else:
        print(f"❌ Login failed: {response.text}")
        return
    
    # Test order listing with detailed error catching
    print("\n🔍 Testing order listing...")
    try:
        response = requests.get(f"{BASE_URL}/api/v1/orders/", headers=headers)
        print(f"Status code: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Order listing successful")
            print(f"   Total orders: {data.get('total', 'N/A')}")
            print(f"   Orders returned: {len(data.get('orders', []))}")
        else:
            print(f"❌ Order listing failed")
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Exception during order listing: {str(e)}")

if __name__ == "__main__":
    test_order_listing() 
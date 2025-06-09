#!/usr/bin/env python3
"""
Simple Order Management Test
"""

import requests
import json
import sys
import os
from datetime import datetime
import time

# Fix database path - FastAPI server runs from backend directory
os.chdir(os.path.join(os.path.dirname(__file__), 'backend'))

# Add backend to path
sys.path.append('.')

from sqlalchemy.orm import Session
from app.core.database import get_db_context
from app.models.user import User, RegistrationStatus, UserRole

BASE_URL = "http://localhost:8000"
API_URL = f"{BASE_URL}/api/v1"

def test_simple_order():
    print("🧪 SIMPLE ORDER MANAGEMENT TEST")
    print("=" * 50)
    
    # Create fresh user
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    user_data = {
        "email": f"order_test_{timestamp}@example.com",
        "password": "TestPassword123!",
        "first_name": "Order",
        "last_name": "Tester",
        "company_name": "Order Test Company",
        "nip": "1234567890",
        "phone": "+48123456789",
        "company_address": "Test Address 123",
        "role": "client",
        "data_processing_consent": True,
        "marketing_consent": False
    }
    
    # Register user
    reg_response = requests.post(f"{API_URL}/auth/register", json=user_data)
    if reg_response.status_code not in [200, 201]:
        print(f"❌ User registration failed: {reg_response.status_code}")
        return
    
    user = reg_response.json()
    print(f"✅ User created: {user['email']} (ID: {user['id']})")
    
    # Activate user
    time.sleep(0.2)
    with get_db_context() as db:
        db_user = db.query(User).filter(User.email == user['email']).first()
        if db_user:
            db_user.email_verified = True
            db_user.registration_status = RegistrationStatus.ACTIVE
            print("✅ User activated")
    
    # Login
    login_data = {"username": user['email'], "password": "TestPassword123!"}
    login_response = requests.post(
        f"{API_URL}/auth/login",
        data=login_data,
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        return
    
    token = login_response.json()["access_token"]
    print("✅ Login successful")
    
    # Test order creation
    order_data = {
        "title": "Test Order",
        "description": "Simple test order for precision aluminum components",
        "technology": "CNC Machining",
        "material": "Aluminum 6061",
        "quantity": 100,
        "budget_pln": 1500.00,
        "delivery_deadline": "2025-07-15T10:00:00Z",
        "priority": "normal",
        "specifications": {
            "dimensions": "100x50x25mm",
            "tolerance": "±0.1mm",
            "finish": "Anodized"
        }
    }
    
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    # Create order
    order_response = requests.post(f"{API_URL}/orders/", json=order_data, headers=headers)
    
    print(f"\nOrder creation status: {order_response.status_code}")
    if order_response.status_code in [200, 201]:
        order = order_response.json()
        print(f"✅ Order created: {order.get('id')}")
        print(f"   Title: {order.get('title')}")
        print(f"   Status: {order.get('status')}")
    else:
        print(f"❌ Order creation failed")
        try:
            error = order_response.json()
            print(f"   Error: {error}")
        except:
            print(f"   Response: {order_response.text}")
        return
    
    # List orders
    list_response = requests.get(f"{API_URL}/orders/", headers=headers)
    
    print(f"\nOrder listing status: {list_response.status_code}")
    if list_response.status_code == 200:
        orders = list_response.json()
        print(f"✅ Found {len(orders)} orders")
        for order in orders:
            print(f"   - Order {order.get('id')}: {order.get('title')}")
    else:
        print(f"❌ Order listing failed")
        try:
            error = list_response.json()
            print(f"   Error: {error}")
        except:
            print(f"   Response: {list_response.text}")
    
    print("\n" + "=" * 50)
    print("🎯 Order Management Test Complete")

if __name__ == "__main__":
    test_simple_order() 
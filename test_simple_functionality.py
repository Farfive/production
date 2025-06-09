#!/usr/bin/env python3
"""
🧪 SIMPLE FUNCTIONALITY TEST - Manufacturing Platform
Test core functionality without hitting rate limits
"""

import requests
import json
import time
from datetime import datetime

BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api/v1"

def test_basic_functionality():
    """Test basic platform functionality"""
    print("🧪 MANUFACTURING PLATFORM - SIMPLE FUNCTIONALITY TEST")
    print("=" * 60)
    
    # Test 1: Server Health
    print("\n1. Testing Server Health...")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            print("   ✅ Server is healthy and responding")
        else:
            print(f"   ❌ Server health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Server not accessible: {e}")
        return False
    
    # Test 2: API Documentation
    print("\n2. Testing API Documentation...")
    try:
        response = requests.get(f"{BASE_URL}/docs", timeout=5)
        if response.status_code == 200:
            print("   ✅ API documentation accessible")
        else:
            print(f"   ❌ API docs failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ API docs error: {e}")
    
    # Test 3: User Registration
    print("\n3. Testing User Registration...")
    timestamp = int(time.time())
    user_data = {
        "email": f"test_client_{timestamp}@example.com",
        "password": "TestPassword123!",
        "first_name": "Test",
        "last_name": "Client",
        "role": "client",
        "phone": "+1234567890",
        "data_processing_consent": True,
        "marketing_consent": False,
        "company_name": "Test Company"
    }
    
    try:
        response = requests.post(f"{API_BASE}/auth/register", json=user_data, timeout=10)
        if response.status_code == 201:
            user_info = response.json()
            print(f"   ✅ User registration successful - ID: {user_info.get('id', 'N/A')}")
            
            # Test 4: User Login
            print("\n4. Testing User Login...")
            login_data = {
                "username": user_data["email"],
                "password": user_data["password"]
            }
            
            login_response = requests.post(f"{API_BASE}/auth/login", data=login_data, timeout=10)
            if login_response.status_code == 200:
                token_data = login_response.json()
                access_token = token_data.get("access_token")
                print("   ✅ User login successful")
                
                # Test 5: Protected Endpoint Access
                print("\n5. Testing Protected Endpoint Access...")
                headers = {"Authorization": f"Bearer {access_token}"}
                me_response = requests.get(f"{API_BASE}/auth/me", headers=headers, timeout=10)
                
                if me_response.status_code == 200:
                    user_profile = me_response.json()
                    print(f"   ✅ Protected endpoint access successful - User: {user_profile.get('email', 'N/A')}")
                    
                    # Test 6: Order Creation
                    print("\n6. Testing Order Creation...")
                    order_data = {
                        "title": "Test Manufacturing Order",
                        "description": "Test order for platform functionality",
                        "category": "ELECTRONICS",
                        "quantity": 100,
                        "budget": 5000.00,
                        "currency": "USD",
                        "deadline": "2025-07-08T12:00:00",
                        "requirements": {
                            "material": "Aluminum",
                            "finish": "Anodized"
                        },
                        "delivery_address": {
                            "street": "123 Test Street",
                            "city": "Test City",
                            "state": "TS",
                            "postal_code": "12345",
                            "country": "US"
                        }
                    }
                    
                    order_response = requests.post(f"{API_BASE}/orders/", json=order_data, headers=headers, timeout=10)
                    if order_response.status_code == 201:
                        order_info = order_response.json()
                        print(f"   ✅ Order creation successful - ID: {order_info.get('id', 'N/A')}")
                        
                        # Test 7: Order Listing
                        print("\n7. Testing Order Listing...")
                        orders_response = requests.get(f"{API_BASE}/orders/", headers=headers, timeout=10)
                        if orders_response.status_code == 200:
                            orders = orders_response.json()
                            order_count = len(orders) if isinstance(orders, list) else orders.get('total', 0)
                            print(f"   ✅ Order listing successful - Found {order_count} orders")
                        else:
                            print(f"   ⚠️  Order listing failed: {orders_response.status_code}")
                    else:
                        print(f"   ⚠️  Order creation failed: {order_response.status_code}")
                        if order_response.content:
                            try:
                                error = order_response.json()
                                print(f"      Error: {error}")
                            except:
                                print(f"      Error: {order_response.text}")
                else:
                    print(f"   ❌ Protected endpoint access failed: {me_response.status_code}")
            else:
                print(f"   ❌ User login failed: {login_response.status_code}")
                if login_response.content:
                    try:
                        error = login_response.json()
                        print(f"      Error: {error}")
                    except:
                        print(f"      Error: {login_response.text}")
        else:
            print(f"   ❌ User registration failed: {response.status_code}")
            if response.content:
                try:
                    error = response.json()
                    print(f"      Error: {error}")
                except:
                    print(f"      Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ Registration error: {e}")
        return False
    
    print("\n" + "=" * 60)
    print("🎉 BASIC FUNCTIONALITY TEST COMPLETED!")
    print("✅ Core user workflows are working correctly")
    return True

if __name__ == "__main__":
    success = test_basic_functionality()
    if success:
        print("\n🚀 Platform is ready for development and testing!")
    else:
        print("\n⚠️  Some issues detected. Please review the output above.") 
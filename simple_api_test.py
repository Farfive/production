#!/usr/bin/env python3
"""
Simple API Testing Script for Manufacturing Platform
"""

import requests
import json
from datetime import datetime, timedelta

def test_api():
    base_url = "http://localhost:8000"
    api_url = f"{base_url}/api/v1"
    
    print("🚀 Testing Manufacturing Platform API")
    print("="*50)
    
    # Test 1: Health Check
    print("1. Testing Health Check...")
    try:
        response = requests.get(f"{base_url}/health", timeout=10)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print(f"   Response: {response.json()}")
            print("   ✅ Health check passed")
        else:
            print("   ❌ Health check failed")
    except Exception as e:
        print(f"   ❌ Health check error: {e}")
    
    print()
    
    # Test 2: User Registration
    print("2. Testing User Registration...")
    user_data = {
        "email": "testuser@example.com",
        "password": "TestPassword123!",
        "first_name": "John",
        "last_name": "Doe",
        "company_name": "Test Company",
        "nip": "1234567890",
        "phone": "+48123456789",
        "company_address": "Test Address 123",
        "role": "client",
        "data_processing_consent": True,
        "marketing_consent": False
    }
    
    try:
        response = requests.post(
            f"{api_url}/auth/register", 
            json=user_data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            user = response.json()
            print(f"   User created: {user.get('email', 'Unknown')}")
            print("   ✅ Registration passed")
            
            # Test 3: User Login
            print("\n3. Testing User Login...")
            login_data = {
                "username": user_data["email"],
                "password": user_data["password"]
            }
            
            try:
                login_response = requests.post(
                    f"{api_url}/auth/login",
                    data=login_data,
                    timeout=10
                )
                print(f"   Status: {login_response.status_code}")
                if login_response.status_code == 200:
                    token_data = login_response.json()
                    access_token = token_data.get("access_token")
                    print("   ✅ Login passed")
                    
                    # Test 4: Get User Info
                    print("\n4. Testing Get User Info...")
                    headers = {"Authorization": f"Bearer {access_token}"}
                    try:
                        me_response = requests.get(
                            f"{api_url}/auth/me",
                            headers=headers,
                            timeout=10
                        )
                        print(f"   Status: {me_response.status_code}")
                        if me_response.status_code == 200:
                            user_info = me_response.json()
                            print(f"   User: {user_info.get('email', 'Unknown')}")
                            print("   ✅ Get user info passed")
                            
                            # Test 5: Create Order
                            print("\n5. Testing Create Order...")
                            order_data = {
                                "title": "Test CNC Machining Order",
                                "description": "This is a test order for CNC machining services. We need precision parts manufactured according to specifications.",
                                "technology": "CNC Machining",
                                "material": "Aluminum",
                                "quantity": 50,
                                "budget_pln": 15000.00,
                                "delivery_deadline": (datetime.now() + timedelta(days=30)).isoformat(),
                                "priority": "normal",
                                "preferred_location": "Warsaw",
                                "specifications": {
                                    "dimensions": "100x50x25mm",
                                    "tolerance": "±0.1mm",
                                    "finish": "Anodized"
                                }
                            }
                            
                            try:
                                order_response = requests.post(
                                    f"{api_url}/orders/",
                                    json=order_data,
                                    headers=headers,
                                    timeout=10
                                )
                                print(f"   Status: {order_response.status_code}")
                                if order_response.status_code == 200:
                                    order = order_response.json()
                                    print(f"   Order created: {order.get('id', 'Unknown')}")
                                    print("   ✅ Create order passed")
                                    
                                    # Test 6: Get Orders
                                    print("\n6. Testing Get Orders...")
                                    try:
                                        orders_response = requests.get(
                                            f"{api_url}/orders/",
                                            headers=headers,
                                            timeout=10
                                        )
                                        print(f"   Status: {orders_response.status_code}")
                                        if orders_response.status_code == 200:
                                            orders_data = orders_response.json()
                                            orders_count = len(orders_data.get('orders', []))
                                            print(f"   Orders found: {orders_count}")
                                            print("   ✅ Get orders passed")
                                        else:
                                            print(f"   ❌ Get orders failed: {orders_response.text}")
                                    except Exception as e:
                                        print(f"   ❌ Get orders error: {e}")
                                        
                                else:
                                    print(f"   ❌ Create order failed: {order_response.text}")
                            except Exception as e:
                                print(f"   ❌ Create order error: {e}")
                                
                        else:
                            print(f"   ❌ Get user info failed: {me_response.text}")
                    except Exception as e:
                        print(f"   ❌ Get user info error: {e}")
                        
                else:
                    print(f"   ❌ Login failed: {login_response.text}")
            except Exception as e:
                print(f"   ❌ Login error: {e}")
                
        else:
            print(f"   ❌ Registration failed: {response.text}")
    except Exception as e:
        print(f"   ❌ Registration error: {e}")
    
    print()
    
    # Test 7: Performance Endpoints
    print("7. Testing Performance Endpoints...")
    try:
        perf_response = requests.get(f"{api_url}/performance/health", timeout=10)
        print(f"   Performance Health Status: {perf_response.status_code}")
        if perf_response.status_code == 200:
            print("   ✅ Performance health passed")
        else:
            print("   ❌ Performance health failed")
    except Exception as e:
        print(f"   ❌ Performance health error: {e}")
    
    try:
        cache_response = requests.get(f"{api_url}/performance/cache", timeout=10)
        print(f"   Cache Performance Status: {cache_response.status_code}")
        if cache_response.status_code == 200:
            print("   ✅ Cache performance passed")
        else:
            print("   ❌ Cache performance failed")
    except Exception as e:
        print(f"   ❌ Cache performance error: {e}")
    
    print()
    
    # Test 8: Error Handling
    print("8. Testing Error Handling...")
    try:
        # Test invalid endpoint
        invalid_response = requests.get(f"{api_url}/invalid-endpoint", timeout=10)
        print(f"   Invalid Endpoint Status: {invalid_response.status_code}")
        if invalid_response.status_code == 404:
            print("   ✅ Invalid endpoint handling passed")
        else:
            print("   ❌ Invalid endpoint handling failed")
    except Exception as e:
        print(f"   ❌ Invalid endpoint error: {e}")
    
    try:
        # Test unauthorized access
        unauth_response = requests.get(f"{api_url}/orders/", timeout=10)
        print(f"   Unauthorized Access Status: {unauth_response.status_code}")
        if unauth_response.status_code == 401:
            print("   ✅ Unauthorized access handling passed")
        else:
            print("   ❌ Unauthorized access handling failed")
    except Exception as e:
        print(f"   ❌ Unauthorized access error: {e}")
    
    print("\n" + "="*50)
    print("🏁 API Testing Complete!")

if __name__ == "__main__":
    test_api() 
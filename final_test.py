#!/usr/bin/env python3
"""
Final API Test - Manufacturing Platform
Testing core functionalities step by step
"""

import requests
import json
import time
from datetime import datetime, timedelta

def test_endpoint(name, method, url, **kwargs):
    """Test a single endpoint and return result"""
    print(f"Testing {name}...")
    try:
        start_time = time.time()
        response = requests.request(method, url, timeout=10, **kwargs)
        response_time = time.time() - start_time
        
        print(f"  Status: {response.status_code}")
        print(f"  Response time: {response_time:.3f}s")
        
        if response.status_code < 400:
            print(f"  ✅ {name} - SUCCESS")
            return True, response
        else:
            print(f"  ❌ {name} - FAILED")
            try:
                error_detail = response.json()
                print(f"  Error: {error_detail}")
            except:
                print(f"  Error: {response.text}")
            return False, response
            
    except Exception as e:
        print(f"  ❌ {name} - ERROR: {e}")
        return False, None

def main():
    base_url = "http://localhost:8000"
    api_url = f"{base_url}/api/v1"
    
    print("🚀 Manufacturing Platform API - Final Test")
    print("=" * 60)
    
    # Test 1: Health Check
    print("\n1. Basic Health Checks")
    print("-" * 30)
    
    success, response = test_endpoint("Health Check", "GET", f"{base_url}/health")
    if success:
        data = response.json()
        print(f"  Service: {data.get('service', 'Unknown')}")
        print(f"  Status: {data.get('status', 'Unknown')}")
        print(f"  Version: {data.get('version', 'Unknown')}")
    
    success, response = test_endpoint("Performance Health", "GET", f"{api_url}/performance/health")
    
    # Test 2: Performance Monitoring
    print("\n2. Performance Monitoring")
    print("-" * 30)
    
    test_endpoint("Cache Performance", "GET", f"{api_url}/performance/cache")
    test_endpoint("Performance Summary", "GET", f"{api_url}/performance/summary?hours=1")
    test_endpoint("Performance Budgets", "GET", f"{api_url}/performance/budgets")
    
    # Test 3: Authentication Flow
    print("\n3. Authentication Flow")
    print("-" * 30)
    
    # Register a new user
    timestamp = str(int(time.time()))
    user_data = {
        "email": f"testuser_{timestamp}@example.com",
        "password": "SecurePassword123!",
        "first_name": "John",
        "last_name": "Doe",
        "company_name": "Test Manufacturing Co.",
        "nip": "1234567890",
        "phone": "+48123456789",
        "company_address": "ul. Testowa 123, Warsaw",
        "role": "client",
        "data_processing_consent": True,
        "marketing_consent": False
    }
    
    success, register_response = test_endpoint(
        "User Registration", 
        "POST", 
        f"{api_url}/auth/register",
        json=user_data,
        headers={"Content-Type": "application/json"}
    )
    
    if success:
        user = register_response.json()
        print(f"  User ID: {user.get('id', 'Unknown')}")
        print(f"  Email: {user.get('email', 'Unknown')}")
        
        # Login
        login_data = f"username={user['email']}&password=SecurePassword123!"
        success, login_response = test_endpoint(
            "User Login",
            "POST",
            f"{api_url}/auth/login",
            data=login_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if success:
            token_data = login_response.json()
            access_token = token_data.get("access_token")
            print(f"  Token type: {token_data.get('token_type', 'Unknown')}")
            print(f"  Expires in: {token_data.get('expires_in', 'Unknown')} seconds")
            
            # Get current user
            auth_headers = {"Authorization": f"Bearer {access_token}"}
            success, user_response = test_endpoint(
                "Get Current User",
                "GET",
                f"{api_url}/auth/me",
                headers=auth_headers
            )
            
            if success:
                current_user = user_response.json()
                print(f"  Current user: {current_user.get('email', 'Unknown')}")
                print(f"  Role: {current_user.get('role', 'Unknown')}")
                
                # Test 4: Order Management
                print("\n4. Order Management")
                print("-" * 30)
                
                # Create order
                order_data = {
                    "title": "Custom CNC Machined Components",
                    "description": "We need precision CNC machined aluminum components for automotive application. High quality requirements with tight tolerances.",
                    "technology": "CNC Machining",
                    "material": "Aluminum 6061-T6",
                    "quantity": 100,
                    "budget_pln": 25000.00,
                    "delivery_deadline": (datetime.now() + timedelta(days=45)).isoformat(),
                    "priority": "high",
                    "preferred_location": "Warsaw, Poland",
                    "specifications": {
                        "dimensions": "150x75x30mm",
                        "tolerance": "±0.05mm",
                        "finish": "Anodized Type II",
                        "material_certificate": "Required",
                        "quality_standard": "ISO 9001"
                    }
                }
                
                success, order_response = test_endpoint(
                    "Create Order",
                    "POST",
                    f"{api_url}/orders/",
                    json=order_data,
                    headers={**auth_headers, "Content-Type": "application/json"}
                )
                
                if success:
                    order = order_response.json()
                    print(f"  Order ID: {order.get('id', 'Unknown')}")
                    print(f"  Title: {order.get('title', 'Unknown')}")
                    print(f"  Status: {order.get('status', 'Unknown')}")
                    
                    # Get orders
                    success, orders_response = test_endpoint(
                        "Get Orders",
                        "GET",
                        f"{api_url}/orders/",
                        headers=auth_headers
                    )
                    
                    if success:
                        orders_data = orders_response.json()
                        orders_count = len(orders_data.get('orders', []))
                        print(f"  Orders found: {orders_count}")
                        print(f"  Total: {orders_data.get('total', 0)}")
                        
                        # Test 5: Intelligent Matching
                        print("\n5. Intelligent Matching")
                        print("-" * 30)
                        
                        matching_data = {
                            "order_id": order["id"],
                            "max_results": 5,
                            "enable_fallback": True
                        }
                        
                        success, matching_response = test_endpoint(
                            "Find Manufacturer Matches",
                            "POST",
                            f"{api_url}/matching/find-matches",
                            json=matching_data,
                            headers={**auth_headers, "Content-Type": "application/json"}
                        )
                        
                        if success:
                            matches = matching_response.json()
                            print(f"  Matches found: {matches.get('matches_found', 0)}")
                            print(f"  Processing time: {matches.get('processing_time_seconds', 0):.3f}s")
                        
                        # Test algorithm config
                        test_endpoint(
                            "Get Algorithm Config",
                            "GET",
                            f"{api_url}/matching/algorithm-config",
                            headers=auth_headers
                        )
    
    # Test 6: Error Handling
    print("\n6. Error Handling")
    print("-" * 30)
    
    # Invalid endpoint
    print("Testing invalid endpoint...")
    try:
        response = requests.get(f"{api_url}/invalid-endpoint", timeout=10)
        if response.status_code == 404:
            print("  ✅ Invalid endpoint - correctly returned 404")
        else:
            print(f"  ❌ Invalid endpoint - unexpected status {response.status_code}")
    except Exception as e:
        print(f"  ❌ Invalid endpoint - error: {e}")
    
    # Unauthorized access
    print("Testing unauthorized access...")
    try:
        response = requests.get(f"{api_url}/orders/", timeout=10)
        if response.status_code == 401:
            print("  ✅ Unauthorized access - correctly returned 401")
        else:
            print(f"  ❌ Unauthorized access - unexpected status {response.status_code}")
    except Exception as e:
        print(f"  ❌ Unauthorized access - error: {e}")
    
    # Test 7: Load Test
    print("\n7. Basic Load Test")
    print("-" * 30)
    
    print("Running 20 concurrent health checks...")
    start_time = time.time()
    success_count = 0
    total_requests = 20
    
    for i in range(total_requests):
        try:
            response = requests.get(f"{base_url}/health", timeout=5)
            if response.status_code == 200:
                success_count += 1
        except:
            pass
    
    total_time = time.time() - start_time
    success_rate = (success_count / total_requests) * 100
    rps = total_requests / total_time
    
    print(f"  Requests: {total_requests}")
    print(f"  Successful: {success_count}")
    print(f"  Success rate: {success_rate:.1f}%")
    print(f"  Requests per second: {rps:.1f}")
    print(f"  Total time: {total_time:.3f}s")
    
    if success_rate >= 95:
        print("  ✅ Load test - SUCCESS")
    else:
        print("  ❌ Load test - FAILED")
    
    print("\n" + "=" * 60)
    print("🏁 Testing Complete!")
    print("Check the results above for any issues.")
    print("=" * 60)

if __name__ == "__main__":
    main() 
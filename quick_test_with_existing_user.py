#!/usr/bin/env python3
import json
import urllib.request
import urllib.error
import time
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"

def make_request(method, endpoint, data=None, token=None):
    try:
        url = f"{BASE_URL}{endpoint}"
        
        if data:
            data_json = json.dumps(data).encode('utf-8')
        else:
            data_json = None
            
        req = urllib.request.Request(url, data=data_json, method=method)
        req.add_header('Content-Type', 'application/json')
        
        if token:
            req.add_header('Authorization', f'Bearer {token}')
            
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            return True, result, None
            
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        try:
            error_data = json.loads(error_body)
            return False, error_data, f"HTTP {e.code}: {error_data.get('message', 'Unknown error')}"
        except:
            return False, None, f"HTTP {e.code}: {error_body}"
    except Exception as e:
        return False, None, f"Request error: {str(e)}"

print("🚀 QUICK TEST WITH USER MANAGEMENT")
print("=" * 50)

# Try to login with a known user first
print("\n🔐 STEP 1: Try existing user login")
test_emails = [
    "debug@test.com",
    "client_1749416287@test.com",
    "test@example.com",
    "admin@test.com"
]

token = None
for email in test_emails:
    login_data = {"email": email, "password": "Test123!"}
    success, result, error = make_request("POST", "/api/v1/auth/login-json", login_data)
    if success:
        token = result.get("access_token")
        print(f"✅ Successfully logged in with: {email}")
        break
    else:
        print(f"⚠️ Failed to login with {email}: {error}")

if not token:
    print("\n👤 STEP 2: Register new user")
    timestamp = int(time.time())
    new_email = f"quicktest_{timestamp}@test.com"
    
    user_data = {
        "email": new_email,
        "password": "Test123!",
        "role": "client",
        "first_name": "Quick",
        "last_name": "Test",
        "phone": "+1234567890",
        "company_name": "Quick Test Co",
        "gdpr_consent": True,
        "marketing_consent": True,
        "data_processing_consent": True
    }
    
    success, result, error = make_request("POST", "/api/v1/auth/register", user_data)
    if success:
        print(f"✅ User registered: {new_email}")
        
        # Try to login immediately
        login_data = {"email": new_email, "password": "Test123!"}
        success, result, error = make_request("POST", "/api/v1/auth/login-json", login_data)
        if success:
            token = result.get("access_token")
            print("✅ Successfully logged in with new user")
        else:
            print(f"⚠️ Login failed for new user: {error}")
    else:
        print(f"❌ Registration failed: {error}")

if token:
    print("\n📋 STEP 3: Test order creation")
    order_data = {
        "title": "Quick Test Order",
        "description": "Testing order creation",
        "category": "metal_fabrication",
        "quantity": 10,
        "budget_min": 1000.00,
        "budget_max": 2000.00,
        "deadline": (datetime.now() + timedelta(days=30)).isoformat(),
        "specifications": {"material": "Steel"},
        "location": {
            "address": "123 Test St",
            "city": "Test City",
            "state": "TX",
            "zip_code": "12345",
            "country": "USA"
        }
    }
    
    success, result, error = make_request("POST", "/api/v1/orders/", order_data, token)
    if success:
        order_id = result.get('id')
        print(f"✅ Order created successfully: ID {order_id}")
        
        # Test getting orders
        success, result, error = make_request("GET", "/api/v1/orders/", None, token)
        if success:
            orders = result.get('orders', [])
            print(f"✅ Retrieved {len(orders)} orders")
        else:
            print(f"⚠️ Failed to get orders: {error}")
    else:
        print(f"❌ Order creation failed: {error}")
else:
    print("❌ No valid authentication token available")

print("\n🏁 Quick test completed!") 
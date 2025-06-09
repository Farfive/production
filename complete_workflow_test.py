#!/usr/bin/env python3
"""
Complete Manufacturing Platform Workflow Test
Including user activation and order management
"""
import json
import urllib.request
import urllib.error
import time
import sqlite3
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"

def make_request(method, endpoint, data=None, token=None):
    """Make HTTP request with proper error handling"""
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

def get_verification_token(email):
    """Get verification token from database"""
    try:
        conn = sqlite3.connect('backend/manufacturing_platform.db')
        cursor = conn.cursor()
        cursor.execute('SELECT email_verification_token FROM users WHERE email = ?', (email,))
        result = cursor.fetchone()
        conn.close()
        return result[0] if result else None
    except Exception as e:
        print(f"Database error: {e}")
        return None

def run_complete_test():
    print("🏭 MANUFACTURING PLATFORM - COMPLETE WORKFLOW TEST")
    print("=" * 60)
    
    timestamp = int(time.time())
    
    # Step 1: Register Client
    print("\n👤 STEP 1: Register Client")
    client_email = f"client_{timestamp}@test.com"
    client_data = {
        "email": client_email,
        "password": "ClientTest123!",
        "role": "client",
        "first_name": "Test",
        "last_name": "Client",
        "phone": "+1-555-0001",
        "company_name": "Test Client Co",
        "gdpr_consent": True,
        "marketing_consent": True,
        "data_processing_consent": True
    }
    
    success, result, error = make_request("POST", "/api/v1/auth/register", client_data)
    if not success:
        print(f"❌ Client registration failed: {error}")
        return False
    
    client_id = result.get('id')
    print(f"✅ Client registered successfully - ID: {client_id}")
    
    # Step 2: Verify Client Email
    print("\n📧 STEP 2: Verify Client Email")
    verification_token = get_verification_token(client_email)
    if verification_token:
        success, result, error = make_request("GET", f"/api/v1/auth/verify-email?token={verification_token}")
        if success:
            print("✅ Email verified successfully")
        else:
            # Try POST method
            success, result, error = make_request("POST", "/api/v1/auth/verify-email", {"token": verification_token})
            if success:
                print("✅ Email verified successfully (POST)")
            else:
                print(f"⚠️ Email verification failed: {error}")
    else:
        print("⚠️ No verification token found")
    
    # Step 3: Login Client
    print("\n🔐 STEP 3: Login Client")
    login_data = {"email": client_email, "password": client_data["password"]}
    success, result, error = make_request("POST", "/api/v1/auth/login-json", login_data)
    if not success:
        print(f"❌ Client login failed: {error}")
        return False
    
    client_token = result.get("access_token")
    print("✅ Client login successful")
    
    # Step 4: Create Order
    print("\n📋 STEP 4: Create Order")
    order_data = {
        "title": f"Test Order {timestamp}",
        "description": "Complete workflow test order",
        "category": "metal_fabrication",
        "quantity": 50,
        "budget_min": 5000.00,
        "budget_max": 8000.00,
        "deadline": (datetime.now() + timedelta(days=30)).isoformat(),
        "specifications": {
            "material": "Aluminum",
            "finish": "Anodized",
            "tolerances": "±0.1mm"
        },
        "location": {
            "address": "123 Test Avenue",
            "city": "Test City",
            "state": "TX",
            "zip_code": "12345",
            "country": "USA"
        }
    }
    
    success, result, error = make_request("POST", "/api/v1/orders/", order_data, client_token)
    if not success:
        print(f"❌ Order creation failed: {error}")
        return False
    
    order_id = result.get('id')
    print(f"✅ Order created successfully - ID: {order_id}")
    
    # Step 5: Register Producer
    print("\n🏭 STEP 5: Register Producer")
    producer_email = f"producer_{timestamp}@test.com"
    producer_data = {
        "email": producer_email,
        "password": "ProducerTest123!",
        "role": "producer",
        "first_name": "Test",
        "last_name": "Producer",
        "phone": "+1-555-0002",
        "company_name": "Test Manufacturing Co",
        "gdpr_consent": True,
        "marketing_consent": True,
        "data_processing_consent": True
    }
    
    success, result, error = make_request("POST", "/api/v1/auth/register", producer_data)
    if not success:
        print(f"❌ Producer registration failed: {error}")
        return False
    
    producer_id = result.get('id')
    print(f"✅ Producer registered successfully - ID: {producer_id}")
    
    # Step 6: Verify Producer Email
    print("\n📧 STEP 6: Verify Producer Email")
    verification_token = get_verification_token(producer_email)
    if verification_token:
        success, result, error = make_request("GET", f"/api/v1/auth/verify-email?token={verification_token}")
        if not success:
            success, result, error = make_request("POST", "/api/v1/auth/verify-email", {"token": verification_token})
        
        if success:
            print("✅ Producer email verified successfully")
        else:
            print(f"⚠️ Producer email verification failed: {error}")
    
    # Step 7: Login Producer
    print("\n🔐 STEP 7: Login Producer")
    producer_login = {"email": producer_email, "password": producer_data["password"]}
    success, result, error = make_request("POST", "/api/v1/auth/login-json", producer_login)
    if not success:
        print(f"❌ Producer login failed: {error}")
        return False
    
    producer_token = result.get("access_token")
    print("✅ Producer login successful")
    
    # Step 8: View Orders (Producer perspective)
    print("\n👀 STEP 8: View Available Orders")
    success, result, error = make_request("GET", "/api/v1/orders/", None, producer_token)
    if success:
        orders_count = len(result.get('orders', []))
        print(f"✅ Retrieved {orders_count} orders")
    else:
        print(f"⚠️ Failed to retrieve orders: {error}")
    
    print("\n🎉 COMPLETE WORKFLOW TEST COMPLETED!")
    print("=" * 60)
    return True

if __name__ == "__main__":
    run_complete_test() 
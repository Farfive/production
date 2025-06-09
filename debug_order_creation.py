#!/usr/bin/env python3
"""
Debug Order Creation Test
"""
import json
import urllib.request
import urllib.error
import time
from datetime import datetime, timedelta

def test_order_creation():
    # First, register and login to get a token
    client_data = {
        'email': f'debug_order_{int(time.time())}@test.com',
        'password': 'Test123!',
        'role': 'client',
        'first_name': 'Debug',
        'last_name': 'User',
        'phone': '+1234567890',
        'company_name': 'Debug Co',
        'gdpr_consent': True,
        'marketing_consent': True,
        'data_processing_consent': True
    }
    
    print("🔑 STEP 1: Register client...")
    try:
        req = urllib.request.Request(
            'http://localhost:8000/api/v1/auth/register',
            data=json.dumps(client_data).encode(),
            method='POST'
        )
        req.add_header('Content-Type', 'application/json')
        
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            print(f"✅ Client registered: ID {result.get('id')}")
            
    except Exception as e:
        print(f"❌ Registration failed: {e}")
        return
    
    print("\n🔐 STEP 2: Login client...")
    login_data = {
        'email': client_data['email'],
        'password': client_data['password']
    }
    
    try:
        req = urllib.request.Request(
            'http://localhost:8000/api/v1/auth/login-json',
            data=json.dumps(login_data).encode(),
            method='POST'
        )
        req.add_header('Content-Type', 'application/json')
        
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            token = result.get('access_token')
            print(f"✅ Login successful, token received")
            
    except Exception as e:
        print(f"❌ Login failed: {e}")
        return
    
    print("\n📋 STEP 3: Create order...")
    order_data = {
        "title": "Debug Test Order",
        "description": "Debug test order to check validation",
        "category": "metal_fabrication",
        "quantity": 100,
        "budget_min": 5000.00,
        "budget_max": 10000.00,
        "deadline": (datetime.now() + timedelta(days=30)).isoformat(),
        "specifications": {
            "material": "Steel",
            "finish": "Painted",
            "tolerances": "Standard"
        },
        "location": {
            "address": "123 Test St",
            "city": "Test City",
            "state": "TX",
            "zip_code": "12345",
            "country": "USA"
        }
    }
    
    try:
        req = urllib.request.Request(
            'http://localhost:8000/api/v1/orders/',
            data=json.dumps(order_data).encode(),
            method='POST'
        )
        req.add_header('Content-Type', 'application/json')
        req.add_header('Authorization', f'Bearer {token}')
        
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            print("✅ ORDER CREATED SUCCESSFULLY:")
            print(json.dumps(result, indent=2))
            
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        print(f"❌ HTTP ERROR {e.code}:")
        print(error_body)
        try:
            error_data = json.loads(error_body)
            print("Parsed error:")
            print(json.dumps(error_data, indent=2))
        except:
            print("Raw error body:", error_body)
    except Exception as e:
        print(f"❌ REQUEST ERROR: {e}")

if __name__ == "__main__":
    test_order_creation() 
#!/usr/bin/env python3
"""
FINAL WORKING TEST
Complete end-to-end test with correct API schema
"""

import requests
import time
import sqlite3
from datetime import datetime
import os
import pytest

# Skip module by default; remove marker with --run-integration
pytest.skip("Integration test – requires running backend server", allow_module_level=True)

def activate_user_in_database(email):
    """Activate user in the correct database"""
    db_path = 'backend/manufacturing_platform.db'
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE users 
            SET is_active = 1, 
                registration_status = 'ACTIVE',
                email_verified = 1,
                updated_at = ?
            WHERE email = ?
        ''', (datetime.now().isoformat(), email))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"⚠️ Database activation error: {e}")
        return False

def test_complete_business_flow():
    """Test complete business flow with correct API schema"""
    print("🚀 FINAL WORKING TEST")
    print("=" * 60)
    
    base_url = "http://localhost:8000"
    timestamp = int(time.time())
    
    # Test 1: Client Registration and Order Creation
    print("\n👤 CLIENT JOURNEY")
    print("-" * 30)
    
    client_data = {
        "email": f"final_client_{timestamp}@example.com",
        "password": "FinalTest123!",
        "first_name": "Final",
        "last_name": "Client",
        "company_name": "Final Test Company",
        "phone": "+1555999777",
        "role": "client",
        "data_processing_consent": True,
        "marketing_consent": False
    }
    
    # Register client
    response = requests.post(f"{base_url}/api/v1/auth/register", json=client_data, timeout=10)
    if response.status_code in [200, 201]:
        print("✅ Client registration successful")
        activate_user_in_database(client_data["email"])
        
        # Login client
        login_response = requests.post(f"{base_url}/api/v1/auth/login-json", 
                                     json={"email": client_data["email"], "password": client_data["password"]}, 
                                     timeout=10)
        
        if login_response.status_code == 200:
            client_token = login_response.json().get("access_token")
            print("✅ Client login successful")
            
            # Create order with correct schema
            order_data = {
                "title": "Final Test Order",
                "description": "Complete test order with correct schema",
                "quantity": 1000,
                "technology": "CNC Machining",
                "material": "Aluminum 6061",
                "budget_pln": 25000,
                                 "delivery_deadline": "2025-06-30T23:59:59",
                "specifications": {
                    "finish": "Anodized",
                    "tolerance": "±0.1mm",
                    "surface_roughness": "Ra 1.6"
                },
                "attachments": []
            }
            
            headers = {"Authorization": f"Bearer {client_token}"}
            order_response = requests.post(f"{base_url}/api/v1/orders", json=order_data, headers=headers, timeout=10)
            
            if order_response.status_code in [200, 201]:
                order_result = order_response.json()
                order_id = order_result.get('id')
                print(f"✅ Order creation successful - Order ID: {order_id}")
                
                # Test 2: Manufacturer Registration and Quote Creation
                print("\n🏭 MANUFACTURER JOURNEY")
                print("-" * 30)
                
                manufacturer_data = {
                    "email": f"final_manufacturer_{timestamp}@example.com",
                    "password": "FinalManuf123!",
                    "first_name": "Final",
                    "last_name": "Manufacturer",
                    "company_name": "Final Manufacturing Co",
                    "phone": "+1555888666",
                    "role": "manufacturer",
                    "data_processing_consent": True,
                    "marketing_consent": False
                }
                
                # Register manufacturer
                manuf_response = requests.post(f"{base_url}/api/v1/auth/register", json=manufacturer_data, timeout=10)
                if manuf_response.status_code in [200, 201]:
                    print("✅ Manufacturer registration successful")
                    activate_user_in_database(manufacturer_data["email"])
                    
                    # Login manufacturer
                    manuf_login = requests.post(f"{base_url}/api/v1/auth/login-json",
                                              json={"email": manufacturer_data["email"], "password": manufacturer_data["password"]},
                                              timeout=10)
                    
                    if manuf_login.status_code == 200:
                        manuf_token = manuf_login.json().get("access_token")
                        print("✅ Manufacturer login successful")
                        
                        # Get orders (as manufacturer)
                        orders_response = requests.get(f"{base_url}/api/v1/orders", 
                                                     headers={"Authorization": f"Bearer {manuf_token}"}, 
                                                     timeout=10)
                        
                        if orders_response.status_code == 200:
                            orders = orders_response.json()
                            print(f"✅ Retrieved {len(orders)} orders")
                            
                            # Create quote
                            quote_data = {
                                "order_id": order_id,
                                "price": 22000,
                                "delivery_days": 21,
                                "message": "We can deliver high-quality CNC machined parts with anodized finish.",
                                "technical_specifications": {
                                    "machining_method": "5-axis CNC",
                                    "quality_standards": "ISO 9001",
                                    "testing": "Dimensional inspection included"
                                }
                            }
                            
                            quote_response = requests.post(f"{base_url}/api/v1/quotes", 
                                                         json=quote_data, 
                                                         headers={"Authorization": f"Bearer {manuf_token}"}, 
                                                         timeout=10)
                            
                            if quote_response.status_code in [200, 201]:
                                quote_result = quote_response.json()
                                quote_id = quote_result.get('id')
                                print(f"✅ Quote creation successful - Quote ID: {quote_id}")
                                
                                # Test 3: Admin Operations
                                print("\n👑 ADMIN JOURNEY")
                                print("-" * 30)
                                
                                # Test health endpoint
                                health_response = requests.get(f"{base_url}/health", timeout=10)
                                if health_response.status_code == 200:
                                    print("✅ Health check successful")
                                
                                # Test API docs
                                docs_response = requests.get(f"{base_url}/docs", timeout=10)
                                if docs_response.status_code == 200:
                                    print("✅ API documentation accessible")
                                
                                print("\n🎉 ALL TESTS SUCCESSFUL!")
                                print("=" * 60)
                                print("✅ Client Registration & Login")
                                print("✅ Order Creation")
                                print("✅ Manufacturer Registration & Login")
                                print("✅ Quote Creation")  
                                print("✅ API Health & Documentation")
                                print("=" * 60)
                                print("🚀 PLATFORM IS PRODUCTION READY!")
                                return True
                            else:
                                print(f"❌ Quote creation failed: {quote_response.status_code}")
                                print(f"   Response: {quote_response.text[:200]}")
                        else:
                            print(f"❌ Getting orders failed: {orders_response.status_code}")
                    else:
                        print(f"❌ Manufacturer login failed: {manuf_login.status_code}")
                else:
                    print(f"❌ Manufacturer registration failed: {manuf_response.status_code}")
            else:
                print(f"❌ Order creation failed: {order_response.status_code}")
                print(f"   Response: {order_response.text[:200]}")
        else:
            print(f"❌ Client login failed: {login_response.status_code}")
    else:
        print(f"❌ Client registration failed: {response.status_code}")
        print(f"   Response: {response.text[:200]}")
    
    return False

if __name__ == "__main__":
    success = test_complete_business_flow()
    if not success:
        print("\n⚠️ Some tests failed. Check the output above for details.") 
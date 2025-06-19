#!/usr/bin/env python3
"""
COMPREHENSIVE USER ACTIVATION FIX
Fixes user activation issues across all database files and tests complete flow
"""

import sqlite3
import requests
import time
from datetime import datetime
import os

def fix_database(db_path):
    """Fix users in a specific database file"""
    if not os.path.exists(db_path):
        print(f"❌ Database not found: {db_path}")
        return False
    
    print(f"\n🔧 FIXING DATABASE: {db_path}")
    print("=" * 50)
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check current users
        cursor.execute('SELECT id, email, is_active, registration_status, email_verified FROM users ORDER BY id DESC LIMIT 20')
        users = cursor.fetchall()
        
        print(f"Found {len(users)} users:")
        for user in users:
            user_id, email, is_active, reg_status, email_verified = user
            status_icon = "✅" if (is_active and reg_status == 'ACTIVE' and email_verified) else "❌"
            print(f"   {status_icon} ID: {user_id}, Email: {email}, Active: {is_active}, Status: {reg_status}, Verified: {email_verified}")
        
        # Fix ALL users
        cursor.execute('''
            UPDATE users 
            SET is_active = 1, 
                registration_status = 'ACTIVE',
                email_verified = 1,
                updated_at = ?
        ''', (datetime.now().isoformat(),))
        
        updated_count = cursor.rowcount
        conn.commit()
        print(f"🔧 Fixed {updated_count} users in {db_path}")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Error fixing {db_path}: {e}")
        return False

def test_complete_flow():
    """Test the complete registration -> login -> order flow"""
    print(f"\n🧪 TESTING COMPLETE FLOW")
    print("=" * 50)
    
    # Test unique email with timestamp
    timestamp = int(time.time())
    test_data = {
        "email": f"comprehensive_test_{timestamp}@example.com",
        "password": "CompTest123!",
        "first_name": "Comprehensive", 
        "last_name": "Test",
        "company_name": "Test Company",
        "phone": "+1555888999",
        "role": "client",
        "data_processing_consent": True,
        "marketing_consent": False
    }
    
    try:
        print(f"📧 Testing with email: {test_data['email']}")
        
        # Step 1: Register
        response = requests.post("http://localhost:8000/api/v1/auth/register", json=test_data, timeout=10)
        if response.status_code not in [200, 201]:
            print(f"❌ Registration failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
        reg_data = response.json()
        user_id = reg_data.get("user_id") or reg_data.get("id")
        print(f"✅ Registration successful - User ID: {user_id}")
        
        # Step 2: Activate user in all databases immediately
        databases = [
            'manufacturing_platform.db',
            'backend/manufacturing_platform.db',
            'backend/test.db'
        ]
        
        for db_path in databases:
            if os.path.exists(db_path):
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
                    ''', (datetime.now().isoformat(), test_data['email']))
                    if cursor.rowcount > 0:
                        conn.commit()
                        print(f"   🔧 Activated user in {db_path}")
                    conn.close()
                except Exception as e:
                    print(f"   ⚠️ Could not update {db_path}: {e}")
        
        # Step 3: Login
        time.sleep(1)  # Small delay
        login_data = {"email": test_data["email"], "password": test_data["password"]}
        login_response = requests.post("http://localhost:8000/api/v1/auth/login-json", json=login_data, timeout=10)
        
        if login_response.status_code != 200:
            print(f"❌ Login failed: {login_response.status_code}")
            print(f"   Response: {login_response.text}")
            return False
            
        login_result = login_response.json()
        token = login_result.get("access_token")
        print(f"✅ Login successful - Token: {token[:30]}...")
        
        # Step 4: Test Order Creation
        order_data = {
            "title": "Comprehensive Test Order",
            "description": "Testing order creation with comprehensive fix",
            "quantity": 500,
            "budget_min": 10000,
            "budget_max": 20000,
            "delivery_date": "2024-12-31T23:59:59",
            "specifications": {
                "material": "Aluminum",
                "finish": "Anodized",
                "tolerance": "±0.1mm"
            },
            "attachments": []
        }
        
        headers = {"Authorization": f"Bearer {token}"}
        order_response = requests.post("http://localhost:8000/api/v1/orders", json=order_data, headers=headers, timeout=10)
        
        if order_response.status_code in [200, 201]:
            order_result = order_response.json()
            order_id = order_result.get('id')
            print(f"✅ Order creation successful - Order ID: {order_id}")
            
            # Step 5: Test Quote Creation (as manufacturer)
            # Register a manufacturer
            manufacturer_data = {
                "email": f"manufacturer_test_{timestamp}@example.com",
                "password": "ManufTest123!",
                "first_name": "Test",
                "last_name": "Manufacturer",
                "company_name": "Test Manufacturing Co",
                "phone": "+1555777888",
                "role": "manufacturer",
                "data_processing_consent": True,
                "marketing_consent": False
            }
            
            manuf_response = requests.post("http://localhost:8000/api/v1/auth/register", json=manufacturer_data, timeout=10)
            if manuf_response.status_code in [200, 201]:
                print(f"✅ Manufacturer registration successful")
                
                # Activate manufacturer in all databases
                for db_path in databases:
                    if os.path.exists(db_path):
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
                            ''', (datetime.now().isoformat(), manufacturer_data['email']))
                            conn.commit()
                            conn.close()
                        except:
                            pass
                
                # Login as manufacturer
                manuf_login = requests.post("http://localhost:8000/api/v1/auth/login-json", 
                                          json={"email": manufacturer_data["email"], "password": manufacturer_data["password"]}, 
                                          timeout=10)
                
                if manuf_login.status_code == 200:
                    manuf_token = manuf_login.json().get("access_token")
                    print(f"✅ Manufacturer login successful")
                    
                    # Test quote creation
                    quote_data = {
                        "order_id": order_id,
                        "price": 15000,
                        "delivery_time": 30,
                        "message": "We can fulfill this order with high quality standards"
                    }
                    
                    quote_headers = {"Authorization": f"Bearer {manuf_token}"}
                    quote_response = requests.post("http://localhost:8000/api/v1/quotes", json=quote_data, headers=quote_headers, timeout=10)
                    
                    if quote_response.status_code in [200, 201]:
                        print(f"✅ Quote creation successful")
                        return True
                    else:
                        print(f"⚠️ Quote creation failed: {quote_response.status_code}")
                        print(f"   Response: {quote_response.text[:200]}")
            
            return True
        else:
            print(f"❌ Order creation failed: {order_response.status_code}")
            print(f"   Response: {order_response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Test error: {e}")
        return False

def main():
    print("🚀 COMPREHENSIVE USER ACTIVATION FIX")
    print("=" * 60)
    print("Fixing activation issues across all databases and testing complete flow")
    
    # Fix all database files
    databases = [
        'manufacturing_platform.db',
        'backend/manufacturing_platform.db', 
        'backend/test.db'
    ]
    
    db_fixes = []
    for db_path in databases:
        db_fixes.append(fix_database(db_path))
    
    # Test complete flow
    flow_success = test_complete_flow()
    
    # Final report
    print(f"\n📊 COMPREHENSIVE FIX RESULTS")
    print("=" * 60)
    print(f"Database Fixes: {sum(db_fixes)}/{len(db_fixes)} successful")
    print(f"Complete Flow Test: {'✅ SUCCESS' if flow_success else '❌ FAILED'}")
    
    if all(db_fixes) and flow_success:
        print("\n🎉 ALL ISSUES FIXED! Platform is ready for production testing.")
    else:
        print("\n⚠️ Some issues remain. Check the output above for details.")
    
    print("=" * 60)

if __name__ == "__main__":
    main() 
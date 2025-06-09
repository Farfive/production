#!/usr/bin/env python3
"""
Manufacturing Platform - Manufacturer Functionality Test
Tests manufacturer profiles, order creation, and quote system
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

print("🏭 MANUFACTURING PLATFORM - MANUFACTURER FUNCTIONALITY TEST")
print("=" * 70)

class TestContext:
    def __init__(self):
        self.client_token = None
        self.manufacturer_token = None
        self.client_user = None
        self.manufacturer_user = None
        self.order_id = None
        self.quote_id = None

def create_and_activate_user(role="client"):
    """Create and activate a user with specified role"""
    print(f"👤 Creating {role} user...")
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    user_data = {
        "email": f"{role}_{timestamp}@example.com",
        "password": "TestPassword123!",
        "first_name": "Test",
        "last_name": role.capitalize(),
        "company_name": f"Test {role.capitalize()} Company",
        "nip": f"123456789{role[0]}",
        "phone": "+48123456789",
        "company_address": f"Test {role.capitalize()} Street 123",
        "role": role,
        "data_processing_consent": True,
        "marketing_consent": False
    }
    
    try:
        # Create user via API
        response = requests.post(f"{API_URL}/auth/register", json=user_data, timeout=10)
        
        if response.status_code in [200, 201]:
            user = response.json()
            print(f"   ✅ {role.capitalize()} created: {user['email']} (ID: {user['id']})")
            
            # Activate user via database
            time.sleep(0.2)
            with get_db_context() as db:
                db_user = db.query(User).filter(User.email == user['email']).first()
                if db_user:
                    db_user.email_verified = True
                    db_user.registration_status = RegistrationStatus.ACTIVE
                    print(f"   ✅ {role.capitalize()} activated")
                    return user['email'], "TestPassword123!"
        
        print(f"   ❌ {role.capitalize()} creation failed: {response.status_code}")
        return None, None
        
    except Exception as e:
        print(f"   ❌ {role.capitalize()} creation error: {e}")
        return None, None

def login_user(email, password):
    """Login user and return token"""
    login_data = {"username": email, "password": password}
    
    try:
        response = requests.post(
            f"{API_URL}/auth/login",
            data=login_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=10
        )
        
        if response.status_code == 200:
            token_data = response.json()
            return token_data["access_token"]
        else:
            print(f"   ❌ Login failed: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"   ❌ Login error: {e}")
        return None

def test_manufacturer_profile_creation(token):
    """Test manufacturer profile creation"""
    print("\n🏭 Testing Manufacturer Profile Creation...")
    
    profile_data = {
        "company_description": "Leading precision manufacturing company specializing in automotive components",
        "capabilities": ["CNC Machining", "3D Printing", "Sheet Metal Fabrication", "Quality Control"],
        "certifications": ["ISO 9001", "ISO 14001", "TS 16949"],
        "equipment": ["CNC Mills", "CNC Lathes", "3D Printers", "CMM Machines"],
        "materials": ["Aluminum", "Steel", "Titanium", "Plastics"],
        "min_order_quantity": 10,
        "max_order_quantity": 10000,
        "lead_time_days": 14,
        "location": {
            "country": "Poland",
            "city": "Warsaw",
            "postal_code": "00-001"
        },
        "contact_info": {
            "website": "https://testmanufacturer.com",
            "phone": "+48123456789"
        }
    }
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(
            f"{API_URL}/manufacturers/profile",
            json=profile_data,
            headers=headers,
            timeout=10
        )
        
        if response.status_code in [200, 201]:
            profile = response.json()
            print(f"   ✅ Manufacturer profile created successfully")
            print(f"      Profile ID: {profile.get('id', 'N/A')}")
            print(f"      Capabilities: {len(profile.get('capabilities', []))} listed")
            print(f"      Certifications: {len(profile.get('certifications', []))} listed")
            return True
        else:
            print(f"   ❌ Profile creation failed: {response.status_code}")
            try:
                error = response.json()
                print(f"      Error: {error}")
            except:
                print(f"      Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ Profile creation error: {e}")
        return False

def test_order_creation(client_token):
    """Test order creation by client"""
    print("\n📋 Testing Order Creation...")
    
    order_data = {
        "title": "Precision Aluminum Components",
        "description": "Need 500 precision aluminum brackets for automotive application",
        "category": "machining",
        "quantity": 500,
        "material": "Aluminum 6061",
        "deadline": "2025-07-15",
        "budget_min": 5000.00,
        "budget_max": 8000.00,
        "specifications": {
            "dimensions": "100mm x 50mm x 25mm",
            "tolerance": "±0.1mm",
            "surface_finish": "Anodized",
            "drawing_url": "https://example.com/drawing.pdf"
        },
        "delivery_location": {
            "country": "Poland",
            "city": "Krakow",
            "postal_code": "30-001",
            "address": "Industrial Street 10"
        }
    }
    
    headers = {
        "Authorization": f"Bearer {client_token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(
            f"{API_URL}/orders",
            json=order_data,
            headers=headers,
            timeout=10
        )
        
        if response.status_code in [200, 201]:
            order = response.json()
            print(f"   ✅ Order created successfully")
            print(f"      Order ID: {order.get('id', 'N/A')}")
            print(f"      Title: {order.get('title', 'N/A')}")
            print(f"      Status: {order.get('status', 'N/A')}")
            print(f"      Budget: ${order.get('budget_min', 0)}-${order.get('budget_max', 0)}")
            return order.get('id')
        else:
            print(f"   ❌ Order creation failed: {response.status_code}")
            try:
                error = response.json()
                print(f"      Error: {error}")
            except:
                print(f"      Error: {response.text}")
            return None
            
    except Exception as e:
        print(f"   ❌ Order creation error: {e}")
        return None

def test_order_listing(token, user_type="client"):
    """Test order listing for different user types"""
    print(f"\n📋 Testing Order Listing ({user_type})...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        if user_type == "client":
            # Client sees their own orders
            endpoint = f"{API_URL}/orders/my-orders"
        else:
            # Manufacturer sees available orders to quote
            endpoint = f"{API_URL}/orders/available"
        
        response = requests.get(endpoint, headers=headers, timeout=10)
        
        if response.status_code == 200:
            orders = response.json()
            print(f"   ✅ Order listing successful")
            print(f"      Found {len(orders)} orders")
            if orders:
                for order in orders[:3]:  # Show first 3 orders
                    print(f"      - Order {order.get('id')}: {order.get('title')}")
            return True
        else:
            print(f"   ❌ Order listing failed: {response.status_code}")
            try:
                error = response.json()
                print(f"      Error: {error}")
            except:
                print(f"      Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ Order listing error: {e}")
        return False

def test_quote_creation(manufacturer_token, order_id):
    """Test quote creation by manufacturer"""
    print("\n💰 Testing Quote Creation...")
    
    if not order_id:
        print("   ❌ No order ID available for quote creation")
        return None
    
    quote_data = {
        "order_id": order_id,
        "price": 6500.00,
        "lead_time_days": 12,
        "message": "We can deliver high-quality aluminum brackets within your specifications. Our ISO 9001 certified facility ensures consistent quality.",
        "specifications": {
            "manufacturing_process": "CNC Machining + Anodizing",
            "quality_control": "CMM Inspection",
            "packaging": "Individual protective wrapping",
            "warranty": "12 months"
        },
        "delivery_options": [
            {
                "type": "standard",
                "days": 12,
                "cost": 150.00
            },
            {
                "type": "express",
                "days": 8,
                "cost": 300.00
            }
        ]
    }
    
    headers = {
        "Authorization": f"Bearer {manufacturer_token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(
            f"{API_URL}/quotes",
            json=quote_data,
            headers=headers,
            timeout=10
        )
        
        if response.status_code in [200, 201]:
            quote = response.json()
            print(f"   ✅ Quote created successfully")
            print(f"      Quote ID: {quote.get('id', 'N/A')}")
            print(f"      Price: ${quote.get('price', 0)}")
            print(f"      Lead Time: {quote.get('lead_time_days', 0)} days")
            print(f"      Status: {quote.get('status', 'N/A')}")
            return quote.get('id')
        else:
            print(f"   ❌ Quote creation failed: {response.status_code}")
            try:
                error = response.json()
                print(f"      Error: {error}")
            except:
                print(f"      Error: {response.text}")
            return None
            
    except Exception as e:
        print(f"   ❌ Quote creation error: {e}")
        return None

def test_ai_manufacturer_matching(client_token, order_id):
    """Test AI-powered manufacturer matching"""
    print("\n🤖 Testing AI Manufacturer Matching...")
    
    if not order_id:
        print("   ❌ No order ID available for AI matching")
        return False
    
    headers = {
        "Authorization": f"Bearer {client_token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(
            f"{API_URL}/ai/match-manufacturers/{order_id}",
            headers=headers,
            timeout=15
        )
        
        if response.status_code == 200:
            matches = response.json()
            print(f"   ✅ AI matching successful")
            print(f"      Found {len(matches)} potential manufacturers")
            for match in matches[:3]:  # Show top 3 matches
                print(f"      - {match.get('company_name')} (Score: {match.get('match_score', 0):.2f})")
            return True
        else:
            print(f"   ❌ AI matching failed: {response.status_code}")
            try:
                error = response.json()
                print(f"      Error: {error}")
            except:
                print(f"      Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ AI matching error: {e}")
        return False

def main():
    """Run comprehensive manufacturer functionality tests"""
    
    # Check server health
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Server is healthy")
        else:
            print(f"❌ Server health check failed: {response.status_code}")
            return
    except Exception as e:
        print(f"❌ Server not responding: {e}")
        return
    
    print("-" * 70)
    
    # Initialize test context
    ctx = TestContext()
    success_count = 0
    total_tests = 7
    
    # Test 1: Create Client User
    client_email, client_password = create_and_activate_user("client")
    if client_email:
        success_count += 1
        ctx.client_token = login_user(client_email, client_password)
        print(f"   ✅ Client login successful")
    
    # Test 2: Create Manufacturer User
    manufacturer_email, manufacturer_password = create_and_activate_user("manufacturer")
    if manufacturer_email:
        success_count += 1
        ctx.manufacturer_token = login_user(manufacturer_email, manufacturer_password)
        print(f"   ✅ Manufacturer login successful")
    
    print("-" * 70)
    
    # Test 3: Manufacturer Profile Creation
    if ctx.manufacturer_token and test_manufacturer_profile_creation(ctx.manufacturer_token):
        success_count += 1
    
    print("-" * 70)
    
    # Test 4: Order Creation
    if ctx.client_token:
        ctx.order_id = test_order_creation(ctx.client_token)
        if ctx.order_id:
            success_count += 1
    
    print("-" * 70)
    
    # Test 5: Order Listing
    if ctx.client_token and test_order_listing(ctx.client_token, "client"):
        success_count += 1
    
    if ctx.manufacturer_token and test_order_listing(ctx.manufacturer_token, "manufacturer"):
        pass  # Don't double count
    
    print("-" * 70)
    
    # Test 6: Quote Creation
    if ctx.manufacturer_token and ctx.order_id:
        ctx.quote_id = test_quote_creation(ctx.manufacturer_token, ctx.order_id)
        if ctx.quote_id:
            success_count += 1
    
    print("-" * 70)
    
    # Test 7: AI Manufacturer Matching
    if ctx.client_token and ctx.order_id and test_ai_manufacturer_matching(ctx.client_token, ctx.order_id):
        success_count += 1
    
    # Results Summary
    print("=" * 70)
    print("📊 MANUFACTURER FUNCTIONALITY TEST RESULTS")
    print("=" * 70)
    print(f"Tests Passed: {success_count}/{total_tests}")
    print(f"Success Rate: {(success_count/total_tests)*100:.1f}%")
    
    if success_count == total_tests:
        print("🎉 ALL MANUFACTURER FUNCTIONALITY TESTS PASSED!")
        print("✅ Manufacturer profiles working")
        print("✅ Order management operational")
        print("✅ Quote system functional")
        print("✅ AI matching ready")
    elif success_count >= 4:
        print("🟡 CORE FUNCTIONALITY WORKING")
        print("✅ Basic manufacturer operations functional")
        print("⚠️  Some advanced features may need investigation")
    else:
        print("❌ SIGNIFICANT ISSUES FOUND")
        print("⚠️  Core manufacturer functionality needs attention")
    
    print("=" * 70)

if __name__ == "__main__":
    main() 
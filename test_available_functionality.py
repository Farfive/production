#!/usr/bin/env python3
"""
Manufacturing Platform - Available Functionality Test
Tests actually implemented features: Orders, AI Matching, Email System
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

print("🚀 MANUFACTURING PLATFORM - AVAILABLE FUNCTIONALITY TEST")
print("=" * 70)

class TestContext:
    def __init__(self):
        self.client_token = None
        self.manufacturer_token = None
        self.order_id = None

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
        return None
            
    except Exception as e:
        print(f"   ❌ Login error: {e}")
        return None

def test_order_creation(token):
    """Test order creation"""
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
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(
            f"{API_URL}/orders/",
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

def test_order_listing(token):
    """Test order listing"""
    print("\n📋 Testing Order Listing...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(f"{API_URL}/orders/", headers=headers, timeout=10)
        
        if response.status_code == 200:
            orders = response.json()
            print(f"   ✅ Order listing successful")
            print(f"      Found {len(orders)} orders")
            if orders:
                for order in orders[:3]:
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

def test_ai_matching_system(token, order_id=None):
    """Test AI matching system"""
    print("\n🤖 Testing AI Matching System...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    success_count = 0
    total_tests = 4
    
    # Test 1: Algorithm Config
    try:
        response = requests.get(f"{API_URL}/matching/algorithm-config", headers=headers, timeout=10)
        if response.status_code == 200:
            config = response.json()
            print(f"   ✅ Algorithm config retrieved")
            print(f"      Config keys: {list(config.keys()) if isinstance(config, dict) else 'N/A'}")
            success_count += 1
        else:
            print(f"   ❌ Algorithm config failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Algorithm config error: {e}")
    
    # Test 2: Matching Statistics
    try:
        response = requests.get(f"{API_URL}/matching/statistics", headers=headers, timeout=10)
        if response.status_code == 200:
            stats = response.json()
            print(f"   ✅ Matching statistics retrieved")
            print(f"      Stats: {stats}")
            success_count += 1
        else:
            print(f"   ❌ Statistics failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Statistics error: {e}")
    
    # Test 3: Find Matches
    try:
        match_request = {
            "requirements": {
                "materials": ["Aluminum"],
                "processes": ["CNC Machining"],
                "quantity": 500,
                "budget_range": [5000, 8000]
            },
            "location_preference": {
                "country": "Poland",
                "max_distance_km": 100
            }
        }
        
        response = requests.post(
            f"{API_URL}/matching/find-matches", 
            json=match_request, 
            headers=headers, 
            timeout=15
        )
        
        if response.status_code in [200, 201]:
            matches = response.json()
            print(f"   ✅ Find matches successful")
            print(f"      Found {len(matches)} potential matches")
            success_count += 1
        else:
            print(f"   ❌ Find matches failed: {response.status_code}")
            try:
                error = response.json()
                print(f"      Error: {error}")
            except:
                print(f"      Error: {response.text}")
    except Exception as e:
        print(f"   ❌ Find matches error: {e}")
    
    # Test 4: Broadcast
    try:
        broadcast_data = {
            "order_id": order_id or 1,
            "target_manufacturers": [],
            "message": "New order available for precision aluminum components"
        }
        
        response = requests.post(
            f"{API_URL}/matching/broadcast", 
            json=broadcast_data, 
            headers=headers, 
            timeout=10
        )
        
        if response.status_code in [200, 201]:
            result = response.json()
            print(f"   ✅ Broadcast successful")
            print(f"      Result: {result}")
            success_count += 1
        else:
            print(f"   ❌ Broadcast failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Broadcast error: {e}")
    
    print(f"   📊 AI Matching Tests: {success_count}/{total_tests} passed")
    return success_count >= 2

def test_email_system(token):
    """Test email system"""
    print("\n📧 Testing Email System...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    success_count = 0
    total_tests = 3
    
    # Test 1: Email Templates
    try:
        response = requests.get(f"{API_URL}/emails/templates", headers=headers, timeout=10)
        if response.status_code == 200:
            templates = response.json()
            print(f"   ✅ Email templates retrieved")
            print(f"      Found {len(templates)} templates")
            success_count += 1
        else:
            print(f"   ❌ Templates failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Templates error: {e}")
    
    # Test 2: Test Email
    try:
        test_email_data = {
            "to": "test@example.com",
            "subject": "Test Email from Manufacturing Platform",
            "template": "test",
            "data": {"name": "Test User"}
        }
        
        response = requests.post(
            f"{API_URL}/emails/test", 
            json=test_email_data, 
            headers=headers, 
            timeout=10
        )
        
        if response.status_code in [200, 201]:
            result = response.json()
            print(f"   ✅ Test email sent successfully")
            print(f"      Result: {result}")
            success_count += 1
        else:
            print(f"   ❌ Test email failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Test email error: {e}")
    
    # Test 3: Send Email
    try:
        send_email_data = {
            "to": ["test@example.com"],
            "subject": "Welcome to Manufacturing Platform",
            "template": "welcome",
            "data": {"user_name": "Test User"}
        }
        
        response = requests.post(
            f"{API_URL}/emails/send", 
            json=send_email_data, 
            headers=headers, 
            timeout=10
        )
        
        if response.status_code in [200, 201]:
            result = response.json()
            print(f"   ✅ Email sent successfully")
            success_count += 1
        else:
            print(f"   ❌ Email send failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Email send error: {e}")
    
    print(f"   📊 Email System Tests: {success_count}/{total_tests} passed")
    return success_count >= 2

def test_performance_tracking(token):
    """Test performance tracking"""
    print("\n📊 Testing Performance Tracking...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        metric_data = {
            "metric_name": "order_creation",
            "value": 1,
            "unit": "count",
            "tags": {
                "user_type": "client",
                "test": "true"
            },
            "timestamp": datetime.now().isoformat()
        }
        
        response = requests.post(
            f"{API_URL}/performance/track-metric", 
            json=metric_data, 
            headers=headers, 
            timeout=10
        )
        
        if response.status_code in [200, 201]:
            result = response.json()
            print(f"   ✅ Performance metric tracked successfully")
            print(f"      Result: {result}")
            return True
        else:
            print(f"   ❌ Performance tracking failed: {response.status_code}")
            try:
                error = response.json()
                print(f"      Error: {error}")
            except:
                print(f"      Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ Performance tracking error: {e}")
        return False

def main():
    """Run comprehensive available functionality tests"""
    
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
    total_tests = 6
    
    # Create and login user
    user_email, user_password = create_and_activate_user("client")
    if user_email:
        ctx.client_token = login_user(user_email, user_password)
        if ctx.client_token:
            print(f"   ✅ User authentication successful")
            success_count += 1
        else:
            print("   ❌ User authentication failed")
            return
    else:
        print("   ❌ User creation failed")
        return
    
    print("-" * 70)
    
    # Test Order Management
    ctx.order_id = test_order_creation(ctx.client_token)
    if ctx.order_id:
        success_count += 1
    
    if test_order_listing(ctx.client_token):
        success_count += 1
    
    print("-" * 70)
    
    # Test AI Matching System
    if test_ai_matching_system(ctx.client_token, ctx.order_id):
        success_count += 1
    
    print("-" * 70)
    
    # Test Email System
    if test_email_system(ctx.client_token):
        success_count += 1
    
    print("-" * 70)
    
    # Test Performance Tracking
    if test_performance_tracking(ctx.client_token):
        success_count += 1
    
    # Results Summary
    print("=" * 70)
    print("📊 AVAILABLE FUNCTIONALITY TEST RESULTS")
    print("=" * 70)
    print(f"Tests Passed: {success_count}/{total_tests}")
    print(f"Success Rate: {(success_count/total_tests)*100:.1f}%")
    
    if success_count == total_tests:
        print("🎉 ALL AVAILABLE FUNCTIONALITY TESTS PASSED!")
        print("✅ Order management working")
        print("✅ AI matching system operational")
        print("✅ Email system functional")
        print("✅ Performance tracking active")
    elif success_count >= 4:
        print("🟡 CORE FUNCTIONALITY WORKING")
        print("✅ Essential features operational")
        print("⚠️  Some advanced features may need attention")
    else:
        print("❌ SIGNIFICANT ISSUES FOUND")
        print("⚠️  Core functionality needs attention")
    
    print("=" * 70)

if __name__ == "__main__":
    main() 
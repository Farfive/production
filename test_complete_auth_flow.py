#!/usr/bin/env python3
"""
Complete Authentication Flow Test
Tests the entire authentication process including user activation
"""

import requests
import json
import sys
import os
from datetime import datetime
import time

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Fix database path - FastAPI server runs from backend directory
os.chdir(os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy.orm import Session
from app.core.database import get_db, engine, get_db_context
from app.models.user import User, RegistrationStatus

BASE_URL = "http://localhost:8000"
API_URL = f"{BASE_URL}/api/v1"

print("🧪 COMPLETE AUTHENTICATION FLOW TEST")
print("=" * 60)

def create_and_activate_user():
    """Create a user via API and activate it via database"""
    
    # Step 1: Create user via API
    print("👤 Step 1: Creating user via API...")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    user_data = {
        "email": f"testuser_{timestamp}@example.com",
        "password": "TestPassword123!",
        "first_name": "Test",
        "last_name": "User",
        "company_name": "Test Company Ltd",
        "nip": "1234567890",
        "phone": "+48123456789",
        "company_address": "Test Street 123, Warsaw, Poland",
        "role": "client",
        "data_processing_consent": True,
        "marketing_consent": False
    }
    
    try:
        response = requests.post(f"{API_URL}/auth/register", json=user_data, timeout=10)
        
        if response.status_code in [200, 201]:
            user = response.json()
            print(f"   ✅ User created: {user['email']} (ID: {user['id']})")
            
            # Step 2: Wait a moment for commit, then activate user via database
            print("🔧 Step 2: Activating user via database...")
            time.sleep(0.5)  # Give time for API transaction to commit
            
            # Use the same session pattern as the API
            try:
                with get_db_context() as db:
                    db_user = db.query(User).filter(User.email == user['email']).first()
                    if db_user:
                        print(f"   🔍 Found user in database: {db_user.email}")
                        print(f"      Current status: {db_user.registration_status}")
                        print(f"      Email verified: {db_user.email_verified}")
                        
                        db_user.email_verified = True
                        db_user.registration_status = RegistrationStatus.ACTIVE
                        # db.commit() is handled by the context manager
                        print(f"   ✅ User activated: {db_user.email}")
                        return user['email'], "TestPassword123!"
                    else:
                        print(f"   ❌ User not found in database: {user['email']}")
                        # Let's also try to list all users to debug
                        all_users = db.query(User).all()
                        print(f"   🔍 Total users in database: {len(all_users)}")
                        for u in all_users:
                            print(f"      - {u.email} (ID: {u.id})")
                        return None, None
            except Exception as e:
                print(f"   ❌ Database activation failed: {e}")
                return None, None
            
        else:
            print(f"   ❌ User creation failed: {response.status_code}")
            try:
                error_detail = response.json()
                print(f"      Error: {error_detail}")
            except:
                print(f"      Error: {response.text}")
            return None, None
            
    except Exception as e:
        print(f"   ❌ User creation error: {e}")
        return None, None

def test_login(email, password):
    """Test user login"""
    print("🔐 Step 3: Testing login...")
    
    login_data = {
        "username": email,
        "password": password
    }
    
    try:
        response = requests.post(
            f"{API_URL}/auth/login",
            data=login_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=10
        )
        
        if response.status_code == 200:
            token_data = response.json()
            print(f"   ✅ Login successful")
            return token_data["access_token"]
        else:
            print(f"   ❌ Login failed: {response.status_code}")
            try:
                error_detail = response.json()
                print(f"      Error: {error_detail}")
            except:
                print(f"      Error: {response.text}")
            return None
            
    except Exception as e:
        print(f"   ❌ Login error: {e}")
        return None

def test_authenticated_request(token):
    """Test authenticated request"""
    print("🛡️ Step 4: Testing authenticated request...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(f"{API_URL}/auth/me", headers=headers, timeout=5)
        
        if response.status_code == 200:
            user_data = response.json()
            print(f"   ✅ Authenticated request successful!")
            print(f"      User: {user_data['email']}")
            print(f"      Role: {user_data['role']}")
            print(f"      Status: {user_data['registration_status']}")
            print(f"      Email verified: {user_data['email_verified']}")
            return True
        else:
            print(f"   ❌ Authenticated request failed: {response.status_code}")
            try:
                error_detail = response.json()
                print(f"      Error: {error_detail}")
            except:
                print(f"      Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ Authenticated request error: {e}")
        return False

def main():
    """Run complete authentication flow test"""
    
    # Test health first
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
    
    print("-" * 60)
    
    # Create and activate user
    email, password = create_and_activate_user()
    if not email:
        print("❌ Failed to create and activate user")
        return
    
    print("-" * 60)
    
    # Test login
    token = test_login(email, password)
    if not token:
        print("❌ Failed to login")
        return
    
    print("-" * 60)
    
    # Test authenticated request
    success = test_authenticated_request(token)
    
    print("=" * 60)
    if success:
        print("🎉 COMPLETE AUTHENTICATION FLOW TEST PASSED!")
        print("✅ All authentication components working correctly")
    else:
        print("❌ Authentication flow incomplete")
    print("=" * 60)

if __name__ == "__main__":
    main() 
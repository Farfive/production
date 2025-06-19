#!/usr/bin/env python3
"""
Debug Manufacturer Test - Check validation errors
"""

import requests
import json
import sys
import os
from datetime import datetime

# Fix database path - FastAPI server runs from backend directory
os.chdir(os.path.join(os.path.dirname(__file__), 'backend'))

BASE_URL = "http://localhost:8000"
API_URL = f"{BASE_URL}/api/v1"

def debug_user_creation():
    """Debug user creation to see validation errors"""
    print("🔍 DEBUGGING USER CREATION")
    print("=" * 50)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    user_data = {
        "email": f"debug_{timestamp}@example.com",
        "password": "TestPassword123!",
        "first_name": "Debug",
        "last_name": "User",
        "company_name": "Debug Company",
        "nip": "1234567890",
        "phone": "+48123456789",
        "company_address": "Debug Address",
        "role": "client",
        "data_processing_consent": True,
        "marketing_consent": False
    }
    
    print("📤 Sending registration request...")
    print(f"Data: {json.dumps(user_data, indent=2)}")
    
    try:
        response = requests.post(f"{API_URL}/auth/register", json=user_data, timeout=10)
        
        print(f"\n📥 Response:")
        print(f"Status Code: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        
        try:
            response_json = response.json()
            print(f"JSON Response: {json.dumps(response_json, indent=2)}")
        except:
            print(f"Text Response: {response.text}")
            
        return response.status_code in [200, 201]
        
    except Exception as e:
        print(f"❌ Request error: {e}")
        return False

def test_available_endpoints():
    """Test what endpoints are available"""
    print("\n🔍 TESTING AVAILABLE ENDPOINTS")
    print("=" * 50)
    
    endpoints_to_test = [
        "/health",
        "/api/v1/auth/register",
        "/api/v1/orders",
        "/api/v1/manufacturers",
        "/api/v1/quotes",
        "/docs"  # OpenAPI docs
    ]
    
    for endpoint in endpoints_to_test:
        try:
            if endpoint in ["/api/v1/auth/register", "/api/v1/orders", "/api/v1/quotes"]:
                # POST endpoints - just check if they exist (will get validation error)
                response = requests.post(f"{BASE_URL}{endpoint}", json={}, timeout=5)
                status = response.status_code
            else:
                # GET endpoints
                response = requests.get(f"{BASE_URL}{endpoint}", timeout=5)
                status = response.status_code
            
            if status in [200, 422, 401, 403]:  # 422 means endpoint exists but validation failed
                print(f"   ✅ {endpoint} - Available (Status: {status})")
            else:
                print(f"   ❌ {endpoint} - Status: {status}")
                
        except Exception as e:
            print(f"   ❌ {endpoint} - Error: {e}")

def check_api_documentation():
    """Check API documentation"""
    print("\n📚 CHECKING API DOCUMENTATION")
    print("=" * 50)
    
    try:
        response = requests.get(f"{BASE_URL}/docs", timeout=5)
        if response.status_code == 200:
            print("   ✅ API documentation available at /docs")
        else:
            print(f"   ❌ API docs not available: {response.status_code}")
    except Exception as e:
        print(f"   ❌ API docs error: {e}")
    
    try:
        response = requests.get(f"{BASE_URL}/openapi.json", timeout=5)
        if response.status_code == 200:
            openapi_spec = response.json()
            paths = list(openapi_spec.get('paths', {}).keys())
            print(f"   ✅ OpenAPI spec available - {len(paths)} endpoints defined")
            print("   🔍 Available endpoints:")
            for path in sorted(paths)[:10]:  # Show first 10
                print(f"      - {path}")
            if len(paths) > 10:
                print(f"      ... and {len(paths) - 10} more")
        else:
            print(f"   ❌ OpenAPI spec not available: {response.status_code}")
    except Exception as e:
        print(f"   ❌ OpenAPI spec error: {e}")

def main():
    print("🔧 MANUFACTURING PLATFORM DEBUG TEST")
    print("=" * 60)
    
    # Test server health
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            health = response.json()
            print(f"✅ Server healthy: {health.get('service', 'Unknown')}")
        else:
            print(f"❌ Server health check failed: {response.status_code}")
            return
    except Exception as e:
        print(f"❌ Server not responding: {e}")
        return
    
    # Debug user creation
    debug_user_creation()
    
    # Test available endpoints
    test_available_endpoints()
    
    # Check API documentation
    check_api_documentation()
    
    print("\n" + "=" * 60)
    print("🔍 Debug test completed")

if __name__ == "__main__":
    main() 
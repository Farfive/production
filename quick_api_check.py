#!/usr/bin/env python3
"""
Quick API Verification Script
Checks if backend API endpoints are responding correctly
"""

import requests
import json
import time

def check_endpoint(url, method="GET", data=None, expected_status=200):
    """Check if an endpoint is responding"""
    try:
        if method == "GET":
            response = requests.get(url, timeout=5)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=5)
        
        success = response.status_code == expected_status
        print(f"{'✅' if success else '❌'} {method} {url} - Status: {response.status_code}")
        
        if not success:
            print(f"   Response: {response.text[:100]}...")
        
        return success
    except Exception as e:
        print(f"❌ {method} {url} - Error: {str(e)}")
        return False

def main():
    """Run quick API verification"""
    base_url = "http://localhost:8000"
    
    print("🔍 QUICK API VERIFICATION")
    print("=" * 40)
    
    # Health check
    health_ok = check_endpoint(f"{base_url}/api/v1/performance/health")
    
    if not health_ok:
        print("\n❌ Backend is not running or not responding")
        print("   Start with: cd backend && python -m uvicorn app.main:app --reload")
        return False
    
    # Authentication endpoints
    print("\n🔐 Authentication Endpoints:")
    check_endpoint(f"{base_url}/api/v1/auth/register", "POST", {
        "email": "test@example.com",
        "password": "test123",
        "firstName": "Test",
        "lastName": "User",
        "role": "CLIENT"
    }, expected_status=400)  # Expected to fail with validation error
    
    # Core endpoints
    print("\n📋 Core Endpoints:")
    check_endpoint(f"{base_url}/api/v1/orders", expected_status=401)  # Expected to fail without auth
    check_endpoint(f"{base_url}/api/v1/quotes", expected_status=401)  # Expected to fail without auth
    check_endpoint(f"{base_url}/api/v1/manufacturers", expected_status=401)  # Expected to fail without auth
    
    # Public endpoints
    print("\n🌐 Public Endpoints:")
    check_endpoint(f"{base_url}/docs", expected_status=200)  # Swagger docs
    
    print("\n✅ API verification complete!")
    print("🌐 Frontend should be available at: http://localhost:3000")
    print("📚 API docs available at: http://localhost:8000/docs")
    
    return True

if __name__ == "__main__":
    main() 
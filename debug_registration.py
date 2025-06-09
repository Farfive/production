#!/usr/bin/env python3
"""
Debug Registration Script
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"
API_URL = f"{BASE_URL}/api/v1"

print("🔍 DEBUGGING REGISTRATION ISSUE")
print("=" * 50)

# Test simple registration
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
    response = requests.post(
        f"{API_URL}/auth/register",
        json=user_data,
        timeout=10
    )
    
    print(f"\n📥 Response:")
    print(f"Status Code: {response.status_code}")
    print(f"Headers: {dict(response.headers)}")
    
    try:
        response_data = response.json()
        print(f"JSON Response: {json.dumps(response_data, indent=2)}")
    except:
        print(f"Raw Response: {response.text}")
        
except Exception as e:
    print(f"❌ Request Error: {e}")

# Also test health
print("\n" + "=" * 50)
print("📋 Testing health for comparison...")
try:
    health_response = requests.get(f"{BASE_URL}/health", timeout=5)
    print(f"Health Status: {health_response.status_code}")
    print(f"Health Response: {health_response.json()}")
except Exception as e:
    print(f"Health Error: {e}") 
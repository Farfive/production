"""Test role debug endpoint"""

import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

# Test credentials
MANUFACTURER = {
    "email": "test_manufacturer_1749455351@example.com", 
    "password": "TestPassword123!"
}

# Login
login_data = {
    "username": MANUFACTURER["email"],
    "password": MANUFACTURER["password"],
    "grant_type": "password"
}

print("1. Logging in as manufacturer...")
response = requests.post(
    f"{BASE_URL}/auth/login",
    data=login_data,
    headers={"Content-Type": "application/x-www-form-urlencoded"}
)

if response.status_code == 200:
    token = response.json().get("access_token")
    print(f"✓ Got token: {token[:20]}...")
    
    # Check debug endpoint
    print("\n2. Checking debug endpoint...")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/users/me/debug", headers=headers)
    
    if response.status_code == 200:
        debug_info = response.json()
        print(json.dumps(debug_info, indent=2))
    else:
        print(f"Failed: {response.status_code} - {response.text}")
else:
    print(f"Login failed: {response.status_code} - {response.text}") 
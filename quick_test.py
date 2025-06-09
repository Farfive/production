"""Quick test to check server and problematic endpoints"""

import requests
import time
import sys

# Check if server is running
print("Checking if backend server is running...")
try:
    response = requests.get("http://localhost:8000/health", timeout=2)
    if response.status_code == 200:
        print("✅ Backend server is running!")
        print(f"Health check response: {response.json()}")
    else:
        print(f"❌ Backend returned status {response.status_code}")
        sys.exit(1)
except requests.exceptions.ConnectionError:
    print("❌ Backend server is not running!")
    print("Please start it with: cd backend && python -m uvicorn main:app --reload")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error checking backend: {e}")
    sys.exit(1)

print("\n" + "="*50 + "\n")

# Now run the actual tests
BASE_URL = "http://localhost:8000/api/v1"

# Test credentials
MANUFACTURER = {
    "email": "test_manufacturer_1749455351@example.com", 
    "password": "TestPassword123!"
}

print("Testing manufacturer login and role...")

# Login
login_data = {
    "username": MANUFACTURER["email"],
    "password": MANUFACTURER["password"],
    "grant_type": "password"
}

response = requests.post(
    f"{BASE_URL}/auth/login",
    data=login_data,
    headers={"Content-Type": "application/x-www-form-urlencoded"}
)

if response.status_code == 200:
    token = response.json().get("access_token")
    print(f"✅ Login successful! Token: {token[:20]}...")
    
    # Get user info
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/users/me", headers=headers)
    
    if response.status_code == 200:
        user_info = response.json()
        print(f"\nUser info:")
        print(f"  Email: {user_info.get('email')}")
        print(f"  Role: {user_info.get('role')}")
        print(f"  ID: {user_info.get('id')}")
        
        # Check debug endpoint if it exists
        response = requests.get(f"{BASE_URL}/users/me/debug", headers=headers)
        if response.status_code == 200:
            debug_info = response.json()
            print(f"\nDebug info:")
            print(f"  Role type: {debug_info.get('role_type')}")
            print(f"  Is manufacturer: {debug_info.get('is_manufacturer')}")
            print(f"  Role comparisons: {debug_info.get('role_comparison_debug')}")
else:
    print(f"❌ Login failed: {response.status_code} - {response.text}")

print("\n✅ Quick test completed!") 
"""Debug script to check user roles and quote creation"""

import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

# Test credentials
CLIENT = {
    "email": "test_client_1749455351@example.com",
    "password": "TestPassword123!"
}

MANUFACTURER = {
    "email": "test_manufacturer_1749455351@example.com", 
    "password": "TestPassword123!"
}

def login(email, password):
    """Login and get token"""
    login_data = {
        "username": email,
        "password": password,
        "grant_type": "password"
    }
    response = requests.post(
        f"{BASE_URL}/auth/login",
        data=login_data,
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    else:
        print(f"Login failed for {email}: {response.status_code} - {response.text}")
        return None

def get_user_info(token):
    """Get user info"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/users/me", headers=headers)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Failed to get user info: {response.status_code} - {response.text}")
        return None

def test_create_quote(token, order_id=1):
    """Test creating a quote"""
    headers = {"Authorization": f"Bearer {token}"}
    quote_data = {
        "order_id": order_id,
        "price": 7500.00,
        "currency": "USD",
        "delivery_days": 21,
        "valid_until": "2025-01-01T00:00:00",
        "description": "Test quote",
        "includes_shipping": True,
        "payment_terms": "30% upfront",
        "notes": "Test notes"
    }
    response = requests.post(f"{BASE_URL}/quotes", json=quote_data, headers=headers)
    return response.status_code, response.text

def main():
    print("=== DEBUG: User Roles and Quote Creation ===\n")
    
    # Login as client
    print("1. Login as CLIENT:")
    client_token = login(CLIENT["email"], CLIENT["password"])
    if client_token:
        print(f"   ✓ Got token: {client_token[:20]}...")
        user_info = get_user_info(client_token)
        if user_info:
            print(f"   User info: {json.dumps(user_info, indent=2)}")
            print(f"   Role type: {type(user_info.get('role'))}")
            print(f"   Role value: {repr(user_info.get('role'))}")
    
    print("\n2. Login as MANUFACTURER:")
    manufacturer_token = login(MANUFACTURER["email"], MANUFACTURER["password"])
    if manufacturer_token:
        print(f"   ✓ Got token: {manufacturer_token[:20]}...")
        user_info = get_user_info(manufacturer_token)
        if user_info:
            print(f"   User info: {json.dumps(user_info, indent=2)}")
            print(f"   Role type: {type(user_info.get('role'))}")
            print(f"   Role value: {repr(user_info.get('role'))}")
    
    print("\n3. Test Quote Creation:")
    if client_token:
        print("   Testing with CLIENT token:")
        status, response = test_create_quote(client_token)
        print(f"   Status: {status}")
        print(f"   Response: {response}")
    
    if manufacturer_token:
        print("\n   Testing with MANUFACTURER token:")
        status, response = test_create_quote(manufacturer_token)
        print(f"   Status: {status}")
        print(f"   Response: {response}")

if __name__ == "__main__":
    main() 
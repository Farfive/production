"""Test the problematic endpoints"""

import requests
import json
from datetime import datetime, timedelta

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
    """Login and return token"""
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

print("=== TESTING PROBLEMATIC ENDPOINTS ===\n")

# 1. Login as both users
print("1. Login as CLIENT:")
client_token = login(CLIENT["email"], CLIENT["password"])
print(f"   Token: {client_token[:20] if client_token else 'Failed'}...")

print("\n2. Login as MANUFACTURER:")
manufacturer_token = login(MANUFACTURER["email"], MANUFACTURER["password"])
print(f"   Token: {manufacturer_token[:20] if manufacturer_token else 'Failed'}...")

# 2. Test dashboard endpoint with client token
print("\n3. Test Client Dashboard:")
if client_token:
    headers = {"Authorization": f"Bearer {client_token}"}
    response = requests.get(f"{BASE_URL}/dashboard/client", headers=headers)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        print(f"   Response: {json.dumps(response.json(), indent=2)}")
    else:
        print(f"   Error: {response.text}")

# 3. Create an order first (needed for quote)
print("\n4. Create Order (as client):")
order_id = None
if client_token:
    headers = {"Authorization": f"Bearer {client_token}"}
    order_data = {
        "title": "Test Order for Quote",
        "description": "Testing quote creation",
        "technology": "CNC Machining",
        "material": "Aluminum",
        "quantity": 10,
        "budget_pln": 5000.00,
        "delivery_deadline": (datetime.now() + timedelta(days=30)).isoformat(),
        "priority": "normal",
        "preferred_location": "Warsaw"
    }
    response = requests.post(f"{BASE_URL}/orders", json=order_data, headers=headers)
    print(f"   Status: {response.status_code}")
    if response.status_code in [200, 201]:
        order_id = response.json().get("id")
        print(f"   Order ID: {order_id}")
    else:
        print(f"   Error: {response.text}")

# 4. Test quote creation with manufacturer token
print("\n5. Test Quote Creation (as manufacturer):")
if manufacturer_token and order_id:
    headers = {"Authorization": f"Bearer {manufacturer_token}"}
    quote_data = {
        "order_id": order_id,
        "price": 4500.00,
        "currency": "PLN",
        "delivery_days": 14,
        "valid_until": (datetime.now() + timedelta(days=7)).isoformat(),
        "description": "We can deliver this order",
        "includes_shipping": True,
        "payment_terms": "50% upfront",
        "notes": "Test quote"
    }
    response = requests.post(f"{BASE_URL}/quotes", json=quote_data, headers=headers)
    print(f"   Status: {response.status_code}")
    if response.status_code in [200, 201]:
        print(f"   Quote created: {json.dumps(response.json(), indent=2)}")
    else:
        print(f"   Error: {response.text}")

# 5. Check user debug info
print("\n6. Debug User Info (manufacturer):")
if manufacturer_token:
    headers = {"Authorization": f"Bearer {manufacturer_token}"}
    response = requests.get(f"{BASE_URL}/users/me/debug", headers=headers)
    if response.status_code == 200:
        print(f"   Debug info: {json.dumps(response.json(), indent=2)}")
    else:
        print(f"   Error: {response.status_code} - {response.text}") 
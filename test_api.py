#!/usr/bin/env python3
"""
Simple API testing script for the Manufacturing Platform API
"""

import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

def test_user_registration():
    """Test user registration"""
    print("=== Testing User Registration ===")
    
    data = {
        'email': 'testuser@example.com',
        'password': 'TestPassword123!',
        'first_name': 'Test',
        'last_name': 'User',
        'role': 'client',
        'data_processing_consent': True
    }
    
    try:
        response = requests.post(f'{BASE_URL}/auth/register', json=data)
        print(f'Status: {response.status_code}')
        print(f'Response: {json.dumps(response.json(), indent=2)}')
        return response.status_code == 201, response.json()
    except Exception as e:
        print(f'Error: {str(e)}')
        return False, None

def test_user_login(email="testuser@example.com", password="TestPassword123!"):
    """Test user login"""
    print("\n=== Testing User Login ===")
    
    data = {
        'email': email,
        'password': password
    }
    
    try:
        response = requests.post(f'{BASE_URL}/auth/login', json=data)
        print(f'Status: {response.status_code}')
        print(f'Response: {json.dumps(response.json(), indent=2)}')
        
        if response.status_code == 200:
            return True, response.json().get('access_token')
        return False, None
    except Exception as e:
        print(f'Error: {str(e)}')
        return False, None

def test_orders_endpoint(token=None):
    """Test orders endpoint"""
    print("\n=== Testing Orders Endpoint ===")
    
    headers = {}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    
    try:
        response = requests.get(f'{BASE_URL}/orders/', headers=headers)
        print(f'Status: {response.status_code}')
        print(f'Response: {json.dumps(response.json(), indent=2)}')
        return response.status_code == 200
    except Exception as e:
        print(f'Error: {str(e)}')
        return False

def main():
    """Run all tests"""
    print("Starting API tests...\n")
    
    # Test registration
    reg_success, reg_data = test_user_registration()
    
    # Test login
    login_success, token = test_user_login()
    
    # Test protected endpoint
    if token:
        test_orders_endpoint(token)
    else:
        print("No token available, skipping protected endpoint test")
    
    print("\n=== Test Summary ===")
    print(f"Registration: {'✓' if reg_success else '✗'}")
    print(f"Login: {'✓' if login_success else '✗'}")

if __name__ == "__main__":
    main() 
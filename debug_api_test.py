#!/usr/bin/env python3
"""
Simple debug script to test API endpoints and identify response issues
"""

import requests
import json
import sys

def test_endpoint(url, method='GET', data=None):
    """Test a single endpoint with detailed output"""
    print(f"\n{'='*60}")
    print(f"Testing: {method} {url}")
    print(f"{'='*60}")
    
    try:
        if method.upper() == 'POST':
            response = requests.post(url, json=data, headers={'Content-Type': 'application/json'}, timeout=10)
        else:
            response = requests.get(url, timeout=10)
        
        print(f"Status Code: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        print(f"Content-Type: {response.headers.get('content-type', 'Not specified')}")
        print(f"Content Length: {len(response.content)} bytes")
        print(f"Raw Content: {response.content}")
        print(f"Text Content: {response.text}")
        
        # Try to parse as JSON
        try:
            json_data = response.json()
            print(f"JSON Data: {json.dumps(json_data, indent=2)}")
        except json.JSONDecodeError as e:
            print(f"JSON Decode Error: {e}")
        
        return response.status_code, response.text
        
    except Exception as e:
        print(f"Request Error: {e}")
        return None, str(e)

def main():
    print("API DEBUG TEST")
    print("=" * 60)
    
    base_url = "http://127.0.0.1:8000"
    
    # Test 1: Health endpoint
    test_endpoint(f"{base_url}/health")
    
    # Test 2: Docs endpoint  
    test_endpoint(f"{base_url}/docs")
    
    # Test 3: OpenAPI JSON
    test_endpoint(f"{base_url}/openapi.json")
    
    # Test 4: Registration endpoint
    registration_data = {
        "email": "debug.test@example.com",
        "password": "SecurePass123!",
        "first_name": "Debug",
        "last_name": "Test",
        "company_name": "Debug Corp",
        "role": "client",
        "data_processing_consent": True,
        "marketing_consent": False
    }
    
    test_endpoint(f"{base_url}/api/v1/auth/register", "POST", registration_data)
    
    print(f"\n{'='*60}")
    print("Debug test completed!")
    print(f"{'='*60}")

if __name__ == "__main__":
    main() 
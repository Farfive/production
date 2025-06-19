#!/usr/bin/env python3
"""
Diagnostic script to investigate API response issues
"""

import requests
import json
from datetime import datetime

def print_status(message, level="INFO"):
    timestamp = datetime.now().strftime('%H:%M:%S')
    print(f"{timestamp} [{level}] {message}")

def diagnose_endpoint(method, url, data=None):
    """Diagnose a specific endpoint with detailed output"""
    print(f"\n{'='*60}")
    print(f"DIAGNOSING: {method} {url}")
    print(f"{'='*60}")
    
    headers = {'Content-Type': 'application/json'}
    
    try:
        if method.upper() == 'POST':
            response = requests.post(url, json=data, headers=headers, timeout=10)
        else:
            response = requests.get(url, headers=headers, timeout=10)
        
        print(f"Status Code: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        print(f"Content-Type: {response.headers.get('content-type', 'Not specified')}")
        print(f"Content Length: {len(response.content)} bytes")
        print(f"Has Content: {bool(response.content)}")
        
        if response.content:
            print(f"Raw Content (first 500 chars): {response.content[:500]}")
            print(f"Text Content (first 500 chars): {response.text[:500]}")
            
            # Try to parse as JSON
            try:
                json_data = response.json()
                print(f"JSON Data: {json.dumps(json_data, indent=2)[:500]}")
            except json.JSONDecodeError as e:
                print(f"JSON Decode Error: {e}")
                print("This is likely HTML or plain text response")
        else:
            print("EMPTY RESPONSE - This is the problem!")
            
        return response.status_code, response.content, response.text
        
    except Exception as e:
        print(f"Request Error: {e}")
        return None, None, str(e)

def main():
    print("API RESPONSE DIAGNOSTIC TOOL")
    print("="*60)
    
    base_url = "http://127.0.0.1:8000"
    
    # Test 1: Health endpoint (should work)
    diagnose_endpoint("GET", f"{base_url}/health")
    
    # Test 2: Docs endpoint (might return HTML)
    diagnose_endpoint("GET", f"{base_url}/docs")
    
    # Test 3: OpenAPI JSON (should work)
    diagnose_endpoint("GET", f"{base_url}/openapi.json")
    
    # Test 4: Registration endpoint (the problematic one)
    registration_data = {
        "email": "diagnostic.test@example.com",
        "password": "SecurePass123!",
        "first_name": "Diagnostic",
        "last_name": "Test",
        "company_name": "Test Corp",
        "role": "client",
        "data_processing_consent": True,
        "marketing_consent": False
    }
    
    diagnose_endpoint("POST", f"{base_url}/api/v1/auth/register", registration_data)
    
    # Test 5: Try a simple GET on auth endpoints
    diagnose_endpoint("GET", f"{base_url}/api/v1/auth/register")
    
    print(f"\n{'='*60}")
    print("DIAGNOSTIC COMPLETE")
    print(f"{'='*60}")
    print("Look for:")
    print("1. Empty responses (0 bytes content)")
    print("2. HTML responses instead of JSON")
    print("3. HTTP 500 errors indicating server crashes")
    print("4. Missing endpoints (404 errors)")

if __name__ == "__main__":
    main() 
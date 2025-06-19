#!/usr/bin/env python3
"""
Debug Registration Test
"""
import json
import urllib.request
import urllib.error

def test_registration():
    data = {
        'email': 'debug@test.com',
        'password': 'Test123!',
        'role': 'client',
        'first_name': 'Test',
        'last_name': 'User',
        'phone': '+1234567890',
        'company_name': 'Test Co',
        'gdpr_consent': True,
        'marketing_consent': True,
        'data_processing_consent': True
    }
    
    try:
        req = urllib.request.Request(
            'http://localhost:8000/api/v1/auth/register',
            data=json.dumps(data).encode(),
            method='POST'
        )
        req.add_header('Content-Type', 'application/json')
        
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            print("✅ SUCCESS:")
            print(json.dumps(result, indent=2))
            
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        print(f"❌ HTTP ERROR {e.code}:")
        print(error_body)
        try:
            error_data = json.loads(error_body)
            print("Parsed error:")
            print(json.dumps(error_data, indent=2))
        except:
            print("Raw error body:", error_body)
    except Exception as e:
        print(f"❌ REQUEST ERROR: {e}")

if __name__ == "__main__":
    test_registration() 
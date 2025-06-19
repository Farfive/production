import requests
import json

# Simple test to see what's happening with the API
def test_api():
    base_url = "http://127.0.0.1:8000"
    
    print("Quick API Test")
    print("=" * 40)
    
    # Test health endpoint
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        print(f"Health endpoint: {response.status_code}")
        print(f"Content: {response.text}")
        print()
    except Exception as e:
        print(f"Health endpoint error: {e}")
        return
    
    # Test registration
    reg_data = {
        "email": "quick.test@example.com",
        "password": "SecurePass123!",
        "first_name": "Quick",
        "last_name": "Test",
        "company_name": "Test Corp",
        "role": "client",
        "data_processing_consent": True,
        "marketing_consent": False
    }
    
    try:
        response = requests.post(
            f"{base_url}/api/v1/auth/register", 
            json=reg_data, 
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        print(f"Registration endpoint: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        print(f"Content length: {len(response.content)}")
        print(f"Raw content: {response.content}")
        print(f"Text: {response.text}")
        
        if response.status_code == 500:
            print("Server error - check backend logs")
        
    except Exception as e:
        print(f"Registration error: {e}")

if __name__ == "__main__":
    test_api() 
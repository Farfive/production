import requests
import time

time.sleep(5)  # Wait for server

try:
    response = requests.get("http://127.0.0.1:8000/health", timeout=5)
    print(f"Health check: {response.status_code}")
    
    if response.status_code == 200:
        # Try registration
        test_user = {
            "email": f"test_{int(time.time())}@example.com",
            "password": "TestPassword123!",
            "first_name": "Test",
            "last_name": "User",
            "role": "client",
            "company_name": "Test Company",
            "phone": "+48123456789",
            "data_processing_consent": True
        }
        
        reg_response = requests.post(
            "http://127.0.0.1:8000/api/v1/auth/register",
            json=test_user,
            timeout=10
        )
        
        print(f"Registration: {reg_response.status_code}")
        if reg_response.status_code != 200:
            print(f"Error: {reg_response.text}")
        else:
            print("✅ Registration successful!")
    
except Exception as e:
    print(f"Error: {e}") 
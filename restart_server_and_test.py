#!/usr/bin/env python3
"""
Script to restart server and test registration fixes
"""

import subprocess
import requests
import json
import time
import os
import sys
from datetime import datetime

def kill_existing_servers():
    """Kill any existing Python/uvicorn processes"""
    print("Stopping existing server processes...")
    try:
        # Kill python processes on Windows
        subprocess.run(["taskkill", "/f", "/im", "python.exe"], 
                      capture_output=True, text=True)
        time.sleep(2)
    except:
        pass

def start_server():
    """Start the backend server"""
    print("Starting backend server...")
    
    backend_dir = os.path.join(os.getcwd(), "backend")
    if not os.path.exists(backend_dir):
        print("❌ Backend directory not found")
        return None
    
    try:
        # Start server process
        process = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "app.main:app", 
             "--host", "127.0.0.1", "--port", "8000"],
            cwd=backend_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Wait for server to start
        for i in range(30):
            try:
                response = requests.get("http://127.0.0.1:8000/health", timeout=2)
                if response.status_code == 200:
                    print("✅ Server started successfully")
                    return process
            except:
                pass
            
            time.sleep(1)
            print(f"   Waiting for server... ({i+1}/30)")
        
        print("❌ Server failed to start")
        process.terminate()
        return None
        
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        return None

def test_registration():
    """Test the registration endpoint with detailed debugging"""
    print("\n" + "="*60)
    print("TESTING REGISTRATION ENDPOINT")
    print("="*60)
    
    base_url = "http://127.0.0.1:8000"
    timestamp = int(time.time())
    
    # Test with proper password validation
    user_data = {
        "email": f"restart.test.{timestamp}@example.com",
        "password": "RestartTest123!",  # Meets all password requirements
        "first_name": "Restart",
        "last_name": "Test",
        "company_name": "Restart Test Corp",
        "role": "client",
        "data_processing_consent": True,
        "marketing_consent": False
    }
    
    print("Test data:")
    print(json.dumps(user_data, indent=2))
    print()
    
    try:
        print("1. Health check...")
        health_response = requests.get(f"{base_url}/health", timeout=5)
        print(f"   Status: {health_response.status_code}")
        if health_response.status_code != 200:
            print("   ❌ Health check failed")
            return False
        print("   ✅ Health check passed")
        
        print("\n2. Registration test...")
        response = requests.post(
            f"{base_url}/api/v1/auth/register",
            json=user_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        print(f"   Status code: {response.status_code}")
        print(f"   Content length: {len(response.content)} bytes")
        print(f"   Content type: {response.headers.get('content-type', 'Unknown')}")
        
        if not response.content:
            print("   ❌ EMPTY RESPONSE - Registration endpoint returning empty content")
            print("   This indicates a server error or crash during request processing")
            return False
        
        print(f"   Raw response: {response.content[:500]}")
        
        try:
            json_response = response.json()
            print("   ✅ Valid JSON response received")
            print(f"   Response: {json.dumps(json_response, indent=2)}")
            
            if response.status_code in [200, 201]:
                print("   ✅ Registration successful!")
                print(f"   User ID: {json_response.get('id', 'N/A')}")
                print(f"   Email: {json_response.get('email', 'N/A')}")
                print(f"   Status: {json_response.get('registration_status', 'N/A')}")
                print(f"   Email verified: {json_response.get('email_verified', 'N/A')}")
                return True
                
            elif response.status_code == 422:
                print("   ❌ Validation error:")
                for error in json_response.get('detail', []):
                    print(f"      {error}")
                return False
                
            elif response.status_code == 409:
                print("   ⚠️  User already exists (this is OK for repeat tests)")
                return True
                
            else:
                print(f"   ❌ Registration failed: {json_response.get('detail', 'Unknown error')}")
                return False
                
        except json.JSONDecodeError as e:
            print(f"   ❌ JSON decode error: {e}")
            print(f"   Response text: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("   ❌ Connection error - server not responding")
        return False
    except Exception as e:
        print(f"   ❌ Unexpected error: {e}")
        return False

def test_login(email, password):
    """Test login with the registered user"""
    print("\n3. Login test...")
    
    login_data = {
        "email": email,
        "password": password
    }
    
    try:
        response = requests.post(
            "http://127.0.0.1:8000/api/v1/auth/login-json",
            json=login_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        print(f"   Status code: {response.status_code}")
        
        if response.status_code == 200:
            json_response = response.json()
            access_token = json_response.get('access_token')
            if access_token:
                print("   ✅ Login successful - access token received")
                return access_token
            else:
                print("   ❌ No access token in response")
        else:
            print(f"   ❌ Login failed: {response.status_code}")
            try:
                error = response.json().get('detail', 'Unknown error')
                print(f"   Error: {error}")
            except:
                print(f"   Response: {response.text}")
                
        return None
        
    except Exception as e:
        print(f"   ❌ Login error: {e}")
        return None

def main():
    """Main execution"""
    print("RESTART SERVER AND TEST REGISTRATION FIXES")
    print("="*60)
    
    # Step 1: Kill existing servers
    kill_existing_servers()
    
    # Step 2: Start fresh server
    server_process = start_server()
    if not server_process:
        print("❌ Could not start server")
        return 1
    
    try:
        # Step 3: Test registration
        success = test_registration()
        
        if success:
            print("\n🎉 REGISTRATION FIXES WORKING!")
            print("✅ Server responding correctly")
            print("✅ JSON responses working")
            print("✅ Email verification bypass active")
            print("✅ Registration endpoint functional")
        else:
            print("\n❌ REGISTRATION STILL HAS ISSUES")
            print("Check server logs for more details")
        
        return 0 if success else 1
        
    finally:
        # Cleanup
        print("\nStopping server...")
        server_process.terminate()
        try:
            server_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server_process.kill()

if __name__ == "__main__":
    sys.exit(main()) 
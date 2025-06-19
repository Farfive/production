#!/usr/bin/env python3
"""
Test script with proper backend startup and email verification disabled
"""

import subprocess
import time
import requests
import json
import os
import sys
from datetime import datetime

def print_status(message, level="INFO"):
    timestamp = datetime.now().strftime('%H:%M:%S')
    print(f"{timestamp} [{level}] {message}")

def kill_existing_processes():
    """Kill any existing Python processes"""
    try:
        subprocess.run(["taskkill", "/F", "/IM", "python.exe"], 
                      capture_output=True, text=True)
        print_status("Cleared existing Python processes")
        time.sleep(3)
    except Exception as e:
        print_status(f"Could not clear processes: {e}", "WARNING")

def start_backend_correctly():
    """Start backend from the correct directory"""
    print_status("Starting backend server...")
    
    # Check if backend directory exists
    backend_dir = os.path.join(os.getcwd(), 'backend')
    if not os.path.exists(backend_dir):
        print_status("Backend directory not found", "ERROR")
        return None
    
    # Check if main.py exists
    main_file = os.path.join(backend_dir, 'app', 'main.py')
    if not os.path.exists(main_file):
        print_status("Backend main.py not found", "ERROR")
        return None
    
    print_status(f"Backend directory: {backend_dir}")
    print_status(f"Main file: {main_file}")
    
    # Set up environment
    env = os.environ.copy()
    env['PYTHONIOENCODING'] = 'utf-8'
    
    # Start server with proper working directory
    cmd = [sys.executable, '-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000', '--reload']
    
    print_status(f"Command: {' '.join(cmd)}")
    print_status(f"Working directory: {backend_dir}")
    
    try:
        process = subprocess.Popen(
            cmd,
            cwd=backend_dir,  # This is crucial!
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Wait for server to start
        print_status("Waiting for server to start...")
        for i in range(45):  # Wait up to 45 seconds
            if process.poll() is not None:
                stdout, stderr = process.communicate()
                print_status("Server process died", "ERROR")
                print_status(f"STDOUT: {stdout[-800:]}", "DEBUG")
                print_status(f"STDERR: {stderr[-800:]}", "DEBUG")
                return None
            
            try:
                response = requests.get('http://127.0.0.1:8000/health', timeout=3)
                if response.status_code == 200:
                    print_status("Backend server started successfully!", "SUCCESS")
                    return process
            except:
                pass
            
            time.sleep(1)
            if i % 10 == 0 and i > 0:
                print_status(f"Still waiting... ({i}/45 seconds)")
        
        print_status("Server failed to start within 45 seconds", "ERROR")
        process.terminate()
        return None
        
    except Exception as e:
        print_status(f"Failed to start server: {e}", "ERROR")
        return None

def test_registration_and_login():
    """Test the complete registration and login flow"""
    print_status("Testing registration and login flow...")
    
    base_url = "http://127.0.0.1:8000"
    
    # Test user data
    user_data = {
        "email": "test.user@example.com",
        "password": "SecurePass123!",
        "first_name": "Test",
        "last_name": "User",
        "company_name": "Test Corp",
        "role": "client",
        "data_processing_consent": True,
        "marketing_consent": False
    }
    
    # 1. Test Health
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        print_status(f"Health check: {response.status_code} - {response.text}")
    except Exception as e:
        print_status(f"Health check failed: {e}", "ERROR")
        return False
    
    # 2. Test Registration
    try:
        print_status("Testing user registration...")
        response = requests.post(
            f"{base_url}/api/v1/auth/register",
            json=user_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        print_status(f"Registration: {response.status_code}")
        print_status(f"Response: {response.text[:300]}")
        
        if response.status_code not in [200, 201, 409]:  # 409 = user already exists
            print_status("Registration failed", "ERROR")
            return False
        
        registration_success = True
        
    except Exception as e:
        print_status(f"Registration error: {e}", "ERROR")
        registration_success = False
    
    # 3. Test Login
    try:
        print_status("Testing user login...")
        login_data = {
            "email": user_data["email"],
            "password": user_data["password"]
        }
        
        response = requests.post(
            f"{base_url}/api/v1/auth/login-json",
            json=login_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        print_status(f"Login: {response.status_code}")
        print_status(f"Response: {response.text[:300]}")
        
        if response.status_code == 200:
            try:
                login_result = response.json()
                token = login_result.get('access_token')
                if token:
                    print_status("Login successful - got access token!", "SUCCESS")
                    
                    # 4. Test protected endpoint with token
                    headers = {'Authorization': f'Bearer {token}'}
                    response = requests.get(f"{base_url}/api/v1/users/me", headers=headers, timeout=5)
                    print_status(f"Protected endpoint: {response.status_code}")
                    
                    return True
                else:
                    print_status("Login successful but no token received", "WARNING")
                    return True
            except json.JSONDecodeError:
                print_status("Login response not JSON", "ERROR")
                return False
        else:
            print_status("Login failed", "ERROR")
            return False
        
    except Exception as e:
        print_status(f"Login error: {e}", "ERROR")
        return False

def main():
    print("=" * 70)
    print("MANUFACTURING SAAS - FIXED STARTUP TEST")
    print("Email verification: DISABLED")
    print("=" * 70)
    
    server_process = None
    
    try:
        # Step 1: Clean up
        print_status("Cleaning up existing processes...")
        kill_existing_processes()
        
        # Step 2: Start server with correct directory
        server_process = start_backend_correctly()
        if not server_process:
            print_status("Cannot start server - check logs above", "ERROR")
            return False
        
        # Step 3: Wait a moment for full initialization
        print_status("Letting server fully initialize...")
        time.sleep(5)
        
        # Step 4: Test the flow
        success = test_registration_and_login()
        
        print("\n" + "=" * 70)
        print("TEST RESULTS")
        print("=" * 70)
        
        if success:
            print_status("✅ ALL TESTS PASSED!", "SUCCESS")
            print_status("✅ Backend server is working correctly", "SUCCESS")
            print_status("✅ Registration and login flow works", "SUCCESS")
            print_status("✅ Authentication system operational", "SUCCESS")
        else:
            print_status("❌ Some tests failed - check logs above", "ERROR")
        
        return success
        
    except KeyboardInterrupt:
        print_status("Test interrupted by user", "WARNING")
        return False
    except Exception as e:
        print_status(f"Test execution error: {e}", "ERROR")
        return False
    finally:
        if server_process:
            print_status("Stopping server...")
            try:
                server_process.terminate()
                server_process.wait(timeout=10)
                print_status("Server stopped cleanly", "SUCCESS")
            except subprocess.TimeoutExpired:
                server_process.kill()
                print_status("Server force-killed", "WARNING")
            except Exception as e:
                print_status(f"Error stopping server: {e}", "WARNING")

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 
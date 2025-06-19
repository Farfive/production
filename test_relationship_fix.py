#!/usr/bin/env python3
"""
Test script to verify the database relationship fixes are working
"""

import subprocess
import time
import requests
import sys
import os
import signal
from datetime import datetime

def kill_existing_server():
    """Kill any existing uvicorn processes"""
    try:
        if os.name == 'nt':  # Windows
            subprocess.run(["taskkill", "/f", "/im", "python.exe"], capture_output=True)
            time.sleep(2)
        else:  # Unix-like
            subprocess.run(["pkill", "-f", "uvicorn"], capture_output=True)
            time.sleep(2)
    except:
        pass

def start_server():
    """Start the backend server"""
    print("🔄 Starting backend server...")
    kill_existing_server()
    
    try:
        # Start server in background
        if os.name == 'nt':  # Windows
            process = subprocess.Popen([
                "python", "-m", "uvicorn", "app.main:app", 
                "--host", "127.0.0.1", "--port", "8000", "--reload"
            ], cwd="backend", creationflags=subprocess.CREATE_NEW_PROCESS_GROUP)
        else:  # Unix-like
            process = subprocess.Popen([
                "python", "-m", "uvicorn", "app.main:app", 
                "--host", "127.0.0.1", "--port", "8000", "--reload"
            ], cwd="backend")
        
        # Wait for server to start
        print("⏳ Waiting for server to start...")
        for i in range(30):
            try:
                response = requests.get("http://127.0.0.1:8000/health", timeout=2)
                if response.status_code == 200:
                    print("✅ Server started successfully!")
                    return process
            except:
                pass
            time.sleep(1)
            print(f"   Checking... ({i+1}/30)")
        
        print("❌ Server failed to start")
        return None
        
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        return None

def test_registration():
    """Test user registration to verify relationship fixes"""
    print("\n🧪 Testing user registration...")
    
    # Test data
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
    
    try:
        response = requests.post(
            "http://127.0.0.1:8000/api/v1/auth/register",
            json=test_user,
            timeout=10
        )
        
        print(f"📤 Registration request sent")
        print(f"📦 Status Code: {response.status_code}")
        
        if response.status_code == 201:
            data = response.json()
            print(f"✅ Registration successful!")
            print(f"   User ID: {data.get('id')}")
            print(f"   Email: {data.get('email')}")
            print(f"   Role: {data.get('role')}")
            return True
        else:
            print(f"❌ Registration failed!")
            try:
                error_data = response.json()
                print(f"   Error: {error_data}")
            except:
                print(f"   Raw response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Registration test failed: {e}")
        return False

def main():
    print("=" * 80)
    print("DATABASE RELATIONSHIP FIXES TEST")
    print("=" * 80)
    print(f"⏰ Started at: {datetime.now()}")
    
    # Start server
    server_process = start_server()
    if not server_process:
        print("❌ Failed to start server, exiting")
        return False
    
    try:
        # Test registration
        success = test_registration()
        
        if success:
            print("\n🎉 ALL TESTS PASSED!")
            print("✅ Database relationships are working correctly")
        else:
            print("\n💥 TESTS FAILED!")
            print("❌ Database relationships still have issues")
        
        return success
        
    finally:
        # Clean up server
        print("\n🛑 Stopping server...")
        try:
            if os.name == 'nt':  # Windows
                server_process.send_signal(signal.CTRL_C_EVENT)
            else:  # Unix-like
                server_process.terminate()
            server_process.wait(timeout=5)
        except:
            if os.name == 'nt':
                subprocess.run(["taskkill", "/f", "/pid", str(server_process.pid)], capture_output=True)
            else:
                server_process.kill()

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 
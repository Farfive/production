#!/usr/bin/env python3
"""
Start backend server and run tests
"""

import subprocess
import time
import sys
import os
from multiprocessing import Process

def start_backend_server():
    """Start the backend server"""
    try:
        print("🚀 Starting backend server...")
        os.chdir("backend")
        
        # Start the server using subprocess
        process = subprocess.Popen([
            sys.executable, "-m", "uvicorn", "main:app", 
            "--reload", "--host", "0.0.0.0", "--port", "8000"
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        print("✅ Server process started")
        return process
        
    except Exception as e:
        print(f"❌ Failed to start server: {e}")
        return None

def check_server_startup():
    """Check if server started successfully"""
    import urllib.request
    import json
    
    print("⏳ Waiting for server to start...")
    
    for i in range(30):  # Wait up to 30 seconds
        try:
            response = urllib.request.urlopen("http://localhost:8000/health", timeout=2)
            data = json.loads(response.read().decode())
            
            if data.get('status') == 'healthy':
                print("✅ Server is ready!")
                return True
                
        except Exception:
            time.sleep(1)
            print(f"   Attempt {i+1}/30...")
    
    print("❌ Server failed to start within 30 seconds")
    return False

def run_tests():
    """Run the test suite"""
    print("\n🧪 Running API tests...")
    
    try:
        # Go back to root directory
        os.chdir("..")
        
        # Run the test file
        result = subprocess.run([sys.executable, "test_api_simple.py"], 
                              capture_output=True, text=True)
        
        print("📄 Test Output:")
        print(result.stdout)
        
        if result.stderr:
            print("⚠️ Test Errors:")
            print(result.stderr)
            
        return result.returncode == 0
        
    except Exception as e:
        print(f"❌ Failed to run tests: {e}")
        return False

def check_backend_imports():
    """Check if backend imports work correctly"""
    print("\n🔍 Checking backend imports...")
    
    try:
        os.chdir("backend")
        
        # Test basic import
        result = subprocess.run([
            sys.executable, "-c", 
            "import main; print('✅ Main module imports successfully')"
        ], capture_output=True, text=True, timeout=10)
        
        if result.returncode == 0:
            print(result.stdout.strip())
            return True
        else:
            print("❌ Import failed:")
            print(result.stderr)
            return False
            
    except subprocess.TimeoutExpired:
        print("❌ Import test timed out")
        return False
    except Exception as e:
        print(f"❌ Import test error: {e}")
        return False
    finally:
        os.chdir("..")

def main():
    """Main execution function"""
    print("🎯 Manufacturing Platform Test Suite")
    print("=" * 50)
    
    # First check imports
    import_success = check_backend_imports()
    
    if not import_success:
        print("\n❌ Backend imports failed. Cannot start server.")
        return
    
    # Start server
    server_process = start_backend_server()
    
    if not server_process:
        return
    
    try:
        # Check if server starts successfully
        if check_server_startup():
            # Run tests
            test_success = run_tests()
            
            if test_success:
                print("\n🎉 All tests completed successfully!")
            else:
                print("\n⚠️ Some tests failed. Check output above.")
        else:
            print("\n❌ Server failed to start properly")
            
    finally:
        # Clean up - terminate server
        print("\n🛑 Stopping server...")
        server_process.terminate()
        server_process.wait()
        print("✅ Server stopped")

if __name__ == "__main__":
    main() 
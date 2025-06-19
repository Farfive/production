#!/usr/bin/env python3
import subprocess
import time
import sys
import requests

def check_server():
    """Check if the server is running"""
    try:
        response = requests.get("http://localhost:8000/health", timeout=5)
        return response.status_code == 200
    except:
        return False

def start_server():
    """Start the backend server"""
    print("Starting backend server...")
    try:
        # Start server in background
        process = subprocess.Popen([
            sys.executable, "-m", "uvicorn", "main:app", 
            "--reload", "--host", "0.0.0.0", "--port", "8000"
        ], cwd="backend")
        
        # Wait for server to start
        for i in range(30):  # Wait up to 30 seconds
            if check_server():
                print("Server is running!")
                return process
            time.sleep(1)
            print(f"Waiting for server... ({i+1}/30)")
        
        print("Server failed to start within 30 seconds")
        return None
    except Exception as e:
        print(f"Error starting server: {e}")
        return None

def run_test():
    """Run the role-based access test"""
    print("Running role-based access test...")
    try:
        result = subprocess.run([sys.executable, "role_based_access_test.py"], 
                              capture_output=True, text=True, timeout=120)
        print(result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
        return result.returncode == 0
    except subprocess.TimeoutExpired:
        print("Test timed out after 120 seconds")
        return False
    except Exception as e:
        print(f"Error running test: {e}")
        return False

def main():
    print("🔧 Starting test execution...")
    
    # Check if server is already running
    if not check_server():
        server_process = start_server()
        if not server_process:
            print("❌ Failed to start server")
            return False
    else:
        print("✅ Server is already running")
        server_process = None
    
    # Run the test
    success = run_test()
    
    # Cleanup
    if server_process:
        print("Stopping server...")
        server_process.terminate()
        server_process.wait()
    
    if success:
        print("✅ Test completed successfully")
    else:
        print("❌ Test failed")
    
    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 
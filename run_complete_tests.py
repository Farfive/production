#!/usr/bin/env python3
"""
Manufacturing SaaS Platform - Complete Test Runner
Handles backend startup and runs comprehensive tests with proper encoding
"""

import subprocess
import sys
import time
import urllib.request
import json
import os
import signal
from datetime import datetime

def print_status(message, status="INFO"):
    """Print status message with timestamp"""
    timestamp = datetime.now().strftime('%H:%M:%S')
    status_symbols = {
        "INFO": "[INFO]",
        "SUCCESS": "[SUCCESS]",
        "ERROR": "[ERROR]",
        "WARNING": "[WARNING]"
    }
    symbol = status_symbols.get(status, "[INFO]")
    print(f"{timestamp} {symbol} {message}")

def check_backend_health():
    """Check if backend server is running and healthy"""
    try:
        with urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=5) as response:
            data = json.loads(response.read())
            return True, data.get('status', 'unknown')
    except Exception as e:
        return False, str(e)

def start_backend_server():
    """Start backend server in the correct directory"""
    print_status("Starting backend server...")
    
    # Change to backend directory and start server
    backend_dir = os.path.join(os.getcwd(), 'backend')
    if not os.path.exists(backend_dir):
        print_status("Backend directory not found", "ERROR")
        return None
    
    try:
        # Start the server process
        process = subprocess.Popen(
            [sys.executable, '-m', 'uvicorn', 'app.main:app', '--reload', '--port', '8000'],
            cwd=backend_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Wait for server to start
        print_status("Waiting for backend server to start...")
        for i in range(30):  # Wait up to 30 seconds
            time.sleep(1)
            healthy, status = check_backend_health()
            if healthy:
                print_status(f"Backend server is healthy: {status}", "SUCCESS")
                return process
            if i % 5 == 0:
                print_status(f"Still waiting... ({i+1}/30 seconds)")
        
        print_status("Backend server failed to start within 30 seconds", "ERROR")
        process.terminate()
        return None
        
    except Exception as e:
        print_status(f"Failed to start backend server: {str(e)}", "ERROR")
        return None

def run_test_with_output(test_file, test_name):
    """Run a test file and capture output"""
    print_status(f"Running {test_name}...")
    
    if not os.path.exists(test_file):
        print_status(f"Test file not found: {test_file}", "ERROR")
        return False
    
    try:
        # Set PYTHONIOENCODING to handle Unicode properly
        env = os.environ.copy()
        env['PYTHONIOENCODING'] = 'utf-8'
        
        result = subprocess.run(
            [sys.executable, test_file],
            capture_output=True,
            text=True,
            timeout=300,  # 5 minute timeout
            env=env
        )
        
        if result.returncode == 0:
            print_status(f"{test_name}: PASSED", "SUCCESS")
            return True
        else:
            print_status(f"{test_name}: FAILED (exit code: {result.returncode})", "ERROR")
            if result.stderr:
                print("Error output:")
                print(result.stderr[-500:])  # Last 500 chars of error
            return False
            
    except subprocess.TimeoutExpired:
        print_status(f"{test_name}: TIMEOUT (exceeded 5 minutes)", "ERROR")
        return False
    except Exception as e:
        print_status(f"{test_name}: ERROR - {str(e)}", "ERROR")
        return False

def main():
    """Main test execution"""
    print("=" * 60)
    print("MANUFACTURING SAAS PLATFORM - COMPLETE TEST RUNNER")
    print("=" * 60)
    print_status("Starting comprehensive test execution")
    
    backend_process = None
    
    try:
        # Step 1: Check if backend is already running
        print_status("Checking backend server status...")
        healthy, status = check_backend_health()
        
        if not healthy:
            # Step 2: Start backend server
            backend_process = start_backend_server()
            if not backend_process:
                print_status("Cannot proceed without backend server", "ERROR")
                return False
        else:
            print_status(f"Backend server already running: {status}", "SUCCESS")
        
        # Step 3: Verify database
        db_path = 'backend/manufacturing_platform.db'
        if os.path.exists(db_path):
            print_status("Database file found", "SUCCESS")
        else:
            print_status("Database file not found - some tests may fail", "WARNING")
        
        # Step 4: Run tests
        print_status("Running comprehensive test suite...")
        
        test_suite = [
            ("complete_final_test.py", "Complete Final Test"),
            ("complete_workflow_test.py", "Complete Workflow Test"),
            ("complete_e2e_order_workflow_test.py", "E2E Order Workflow Test"),
        ]
        
        results = []
        for test_file, test_name in test_suite:
            success = run_test_with_output(test_file, test_name)
            results.append((test_name, success))
            time.sleep(2)  # Brief pause between tests
        
        # Step 5: Generate summary
        print_status("Generating test summary...")
        total_tests = len(results)
        passed_tests = sum(1 for _, success in results if success)
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print("\n" + "=" * 60)
        print("TEST EXECUTION SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        print("\nDetailed Results:")
        for test_name, success in results:
            status = "PASSED" if success else "FAILED"
            symbol = "[SUCCESS]" if success else "[ERROR]"
            print(f"  {symbol} {test_name}: {status}")
        
        if success_rate >= 80:
            print_status("EXCELLENT! Platform is performing well", "SUCCESS")
        elif success_rate >= 60:
            print_status("GOOD! Some issues need attention", "WARNING")
        else:
            print_status("CRITICAL! Major issues detected", "ERROR")
        
        return success_rate >= 60
        
    except KeyboardInterrupt:
        print_status("Test execution interrupted by user", "WARNING")
        return False
    except Exception as e:
        print_status(f"Test execution error: {str(e)}", "ERROR")
        return False
    finally:
        # Cleanup: Stop backend server if we started it
        if backend_process:
            print_status("Stopping backend server...")
            backend_process.terminate()
            try:
                backend_process.wait(timeout=10)
                print_status("Backend server stopped", "SUCCESS")
            except subprocess.TimeoutExpired:
                backend_process.kill()
                print_status("Backend server force stopped", "WARNING")

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 
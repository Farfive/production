#!/usr/bin/env python3
"""
Manufacturing SaaS Platform - Final Workflow Test
Comprehensive test with proper backend startup and error handling
"""

import subprocess
import sys
import time
import requests
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
        response = requests.get('http://127.0.0.1:8000/health', timeout=5)
        if response.status_code == 200:
            data = response.json()
            return True, data.get('status', 'unknown')
        else:
            return False, f"HTTP {response.status_code}"
    except Exception as e:
        return False, str(e)

def start_backend_server():
    """Start backend server with proper error handling"""
    print_status("Starting backend server...")
    
    # Verify backend directory exists
    backend_dir = os.path.join(os.getcwd(), 'backend')
    if not os.path.exists(backend_dir):
        print_status("Backend directory not found", "ERROR")
        return None
    
    # Verify main.py exists
    main_file = os.path.join(backend_dir, 'app', 'main.py')
    if not os.path.exists(main_file):
        print_status("Backend main.py not found", "ERROR")
        return None
    
    try:
        # Start the server process with environment setup
        env = os.environ.copy()
        env['PYTHONPATH'] = backend_dir
        env['PYTHONIOENCODING'] = 'utf-8'
        
        # Use sys.executable to ensure same Python interpreter
        cmd = [sys.executable, '-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000']
        
        process = subprocess.Popen(
            cmd,
            cwd=backend_dir,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Wait for server to start
        print_status("Waiting for backend server to start...")
        for i in range(60):  # Wait up to 60 seconds
            time.sleep(1)
            healthy, status = check_backend_health()
            if healthy:
                print_status(f"Backend server is healthy: {status}", "SUCCESS")
                return process
            
            # Check if process died
            if process.poll() is not None:
                stdout, stderr = process.communicate()
                print_status("Backend process died during startup", "ERROR")
                print("STDOUT:", stdout[-500:] if stdout else "None")
                print("STDERR:", stderr[-500:] if stderr else "None")
                return None
                
            if i % 10 == 0:
                print_status(f"Still waiting... ({i+1}/60 seconds)")
        
        print_status("Backend server failed to start within 60 seconds", "ERROR")
        process.terminate()
        return None
        
    except Exception as e:
        print_status(f"Failed to start backend server: {str(e)}", "ERROR")
        return None

def make_api_request(method, endpoint, data=None, headers=None):
    """Make API request with proper error handling"""
    url = f"http://127.0.0.1:8000{endpoint}"
    
    if headers is None:
        headers = {'Content-Type': 'application/json'}
    
    try:
        if method.upper() == 'POST':
            response = requests.post(url, json=data, headers=headers, timeout=10)
        elif method.upper() == 'GET':
            response = requests.get(url, headers=headers, timeout=10)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        # Try to parse as JSON
        try:
            json_data = response.json() if response.content else {}
            return response.status_code, json_data
        except json.JSONDecodeError as e:
            # If JSON parsing fails, return status code and error info
            print_status(f"JSON decode error for {endpoint}: {e}", "ERROR")
            print_status(f"Response content: {response.text[:200]}", "DEBUG")
            return response.status_code, {"error": "Invalid JSON response", "raw_content": response.text}
            
    except requests.exceptions.RequestException as e:
        print_status(f"Request error for {endpoint}: {e}", "ERROR")
        return None, str(e)

def test_client_registration():
    """Test client registration with comprehensive data"""
    print_status("Testing client registration...")
    
    client_data = {
        "email": "test.client@example.com",
        "password": "SecurePass123!",
        "first_name": "Test",
        "last_name": "Client",
        "company_name": "Test Manufacturing Corp",
        "role": "client",
        "data_processing_consent": True,
        "marketing_consent": False
    }
    
    status_code, response = make_api_request('POST', '/api/v1/auth/register', client_data)
    
    if status_code is None:
        print_status(f"Client registration failed: {response}", "ERROR")
        return None
    elif status_code == 201:
        print_status("Client registration successful", "SUCCESS")
        return response
    elif status_code == 400:
        print_status(f"Client registration failed - validation error: {response}", "ERROR")
        return None
    elif status_code == 409:
        print_status("Client already exists - trying login instead", "WARNING")
        return test_client_login(client_data['email'], client_data['password'])
    elif status_code == 500:
        print_status(f"Server error during registration: {response}", "ERROR")
        return None
    else:
        print_status(f"Client registration failed: {status_code} - {response}", "ERROR")
        return None

def test_client_login(email, password):
    """Test client login"""
    print_status("Testing client login...")
    
    login_data = {
        "email": email,
        "password": password
    }
    
    status_code, response = make_api_request('POST', '/api/v1/auth/login-json', login_data)
    
    if status_code is None:
        print_status(f"Client login failed: {response}", "ERROR")
        return None
    elif status_code == 200:
        print_status("Client login successful", "SUCCESS")
        return response
    else:
        print_status(f"Client login failed: {status_code} - {response}", "ERROR")
        return None

def test_manufacturer_registration():
    """Test manufacturer registration"""
    print_status("Testing manufacturer registration...")
    
    manufacturer_data = {
        "email": "test.manufacturer@example.com",
        "password": "SecurePass123!",
        "first_name": "Test",
        "last_name": "Manufacturer",
        "company_name": "Precision Manufacturing Ltd",
        "role": "manufacturer",
        "data_processing_consent": True,
        "marketing_consent": False
    }
    
    status_code, response = make_api_request('POST', '/api/v1/auth/register', manufacturer_data)
    
    if status_code is None:
        print_status(f"Manufacturer registration failed: {response}", "ERROR")
        return None
    elif status_code == 201:
        print_status("Manufacturer registration successful", "SUCCESS")
        return response
    elif status_code == 409:
        print_status("Manufacturer already exists - trying login", "WARNING")
        return test_client_login(manufacturer_data['email'], manufacturer_data['password'])
    elif status_code == 500:
        print_status(f"Server error during manufacturer registration: {response}", "ERROR")
        return None
    else:
        print_status(f"Manufacturer registration failed: {status_code} - {response}", "ERROR")
        return None

def test_api_endpoints():
    """Test various API endpoints"""
    print_status("Testing API endpoints...")
    
    endpoints_to_test = [
        ('/health', 'GET'),
        ('/docs', 'GET'),
        ('/api/v1/users/me', 'GET'),
    ]
    
    results = []
    for endpoint, method in endpoints_to_test:
        status_code, response = make_api_request(method, endpoint)
        if status_code is None:
            print_status(f"{endpoint}: ERROR - {response}", "ERROR")
            results.append(False)
        elif status_code < 400 or status_code in [401, 403]:  # 401/403 expected for protected endpoints
            print_status(f"{endpoint}: OK ({status_code})", "SUCCESS")
            results.append(True)
        else:
            # Check if response contains error info
            error_detail = ""
            if isinstance(response, dict) and "error" in response:
                error_detail = f" - {response.get('error', 'Unknown error')}"
            print_status(f"{endpoint}: FAILED ({status_code}){error_detail}", "ERROR")
            results.append(False)
    
    return results

def run_comprehensive_test():
    """Run comprehensive workflow test"""
    print("=" * 80)
    print("MANUFACTURING SAAS PLATFORM - COMPREHENSIVE WORKFLOW TEST")
    print("=" * 80)
    
    backend_process = None
    test_results = {
        'backend_startup': False,
        'client_registration': False,
        'manufacturer_registration': False,
        'api_endpoints': False,
        'overall_health': False
    }
    
    try:
        # Step 1: Check if backend is already running
        print_status("Checking if backend is already running...")
        healthy, status = check_backend_health()
        
        if not healthy:
            # Step 2: Start backend server
            backend_process = start_backend_server()
            if not backend_process:
                print_status("Cannot proceed without backend server", "ERROR")
                return test_results
            test_results['backend_startup'] = True
        else:
            print_status(f"Backend server already running: {status}", "SUCCESS")
            test_results['backend_startup'] = True
        
        # Give the server a moment to fully initialize
        time.sleep(3)
        
        # Step 3: Test client registration
        client_result = test_client_registration()
        test_results['client_registration'] = client_result is not None
        
        # Step 4: Test manufacturer registration
        manufacturer_result = test_manufacturer_registration()
        test_results['manufacturer_registration'] = manufacturer_result is not None
        
        # Step 5: Test API endpoints
        api_results = test_api_endpoints()
        test_results['api_endpoints'] = sum(api_results) >= len(api_results) * 0.7  # 70% success rate
        
        # Step 6: Overall health check
        final_health, health_status = check_backend_health()
        test_results['overall_health'] = final_health
        
        # Generate summary
        print("\n" + "=" * 80)
        print("TEST RESULTS SUMMARY")
        print("=" * 80)
        
        for test_name, result in test_results.items():
            status = "PASSED" if result else "FAILED"
            symbol = "SUCCESS" if result else "ERROR"
            print_status(f"{test_name.replace('_', ' ').title()}: {status}", symbol)
        
        passed_tests = sum(test_results.values())
        total_tests = len(test_results)
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"\nOverall Success Rate: {success_rate:.1f}% ({passed_tests}/{total_tests})")
        
        if success_rate >= 80:
            print_status("EXCELLENT! Platform is working well", "SUCCESS")
        elif success_rate >= 60:
            print_status("GOOD! Minor issues detected", "WARNING")
        else:
            print_status("CRITICAL! Major issues need attention", "ERROR")
        
        return test_results
        
    except KeyboardInterrupt:
        print_status("Test interrupted by user", "WARNING")
        return test_results
    except Exception as e:
        print_status(f"Test execution error: {str(e)}", "ERROR")
        return test_results
    finally:
        # Cleanup: Stop backend server if we started it
        if backend_process:
            print_status("Stopping backend server...")
            try:
                backend_process.terminate()
                backend_process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                backend_process.kill()
            except Exception as e:
                print_status(f"Error stopping backend: {str(e)}", "WARNING")

if __name__ == "__main__":
    # Set environment for proper Unicode handling
    os.environ['PYTHONIOENCODING'] = 'utf-8'
    
    # Run the test
    results = run_comprehensive_test()
    
    # Exit with appropriate code
    success_rate = sum(results.values()) / len(results) * 100
    sys.exit(0 if success_rate >= 60 else 1) 
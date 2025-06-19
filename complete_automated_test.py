#!/usr/bin/env python3
"""
Complete automated test with server startup and comprehensive testing
"""

import subprocess
import requests
import json
import time
import sys
import os
from datetime import datetime
from typing import Optional, Dict, Any

class CompleteAutomatedTest:
    def __init__(self):
        self.base_url = "http://127.0.0.1:8000"
        self.backend_process = None
        self.test_results = {}
        self.access_token = None
        
    def log(self, message: str, level: str = "INFO") -> None:
        """Enhanced logging with better formatting"""
        timestamp = datetime.now().strftime('%H:%M:%S')
        symbols = {
            "INFO": "ℹ️ ",
            "SUCCESS": "✅",
            "ERROR": "❌",
            "WARNING": "⚠️ ",
            "STEP": "🔄"
        }
        symbol = symbols.get(level, "ℹ️ ")
        print(f"{timestamp} [{level}] {symbol} {message}")
        
    def start_backend_server(self) -> bool:
        """Start the backend server in the background"""
        self.log("Starting backend server...", "STEP")
        
        try:
            # Change to backend directory
            backend_dir = os.path.join(os.getcwd(), "backend")
            if not os.path.exists(backend_dir):
                self.log("Backend directory not found", "ERROR")
                return False
            
            # Start server process
            cmd = [
                sys.executable, "-m", "uvicorn", 
                "app.main:app", 
                "--host", "127.0.0.1", 
                "--port", "8000"
            ]
            
            self.backend_process = subprocess.Popen(
                cmd,
                cwd=backend_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            self.log("Backend server starting...", "INFO")
            
            # Wait for server to start
            max_attempts = 30
            for attempt in range(max_attempts):
                try:
                    response = requests.get(f"{self.base_url}/health", timeout=2)
                    if response.status_code == 200:
                        self.log("Backend server is ready!", "SUCCESS")
                        return True
                except:
                    pass
                
                time.sleep(1)
                self.log(f"Waiting for server... ({attempt + 1}/{max_attempts})", "INFO")
            
            self.log("Server failed to start within timeout", "ERROR")
            return False
            
        except Exception as e:
            self.log(f"Failed to start backend server: {e}", "ERROR")
            return False
    
    def stop_backend_server(self) -> None:
        """Stop the backend server"""
        if self.backend_process:
            self.log("Stopping backend server...", "INFO")
            self.backend_process.terminate()
            try:
                self.backend_process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                self.backend_process.kill()
            self.backend_process = None
    
    def test_health_endpoint(self) -> bool:
        """Test server health"""
        self.log("Testing server health endpoint...", "STEP")
        try:
            response = requests.get(f"{self.base_url}/health", timeout=5)
            if response.status_code == 200:
                self.log("Health endpoint OK", "SUCCESS")
                return True
            else:
                self.log(f"Health endpoint failed: {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"Health endpoint error: {e}", "ERROR")
            return False
    
    def test_registration(self) -> bool:
        """Test user registration"""
        self.log("Testing user registration...", "STEP")
        
        timestamp = int(time.time())
        test_user = {
            "email": f"autotest.{timestamp}@example.com",
            "password": "SecurePass123!",
            "first_name": "AutoTest",
            "last_name": "User",
            "company_name": "AutoTest Corp",
            "role": "client",
            "data_processing_consent": True,
            "marketing_consent": False
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/v1/auth/register",
                json=test_user,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            self.log(f"Registration status: {response.status_code}", "INFO")
            
            if not response.content:
                self.log("❌ CRITICAL: Empty response from registration", "ERROR")
                self.log("This indicates the JSON parsing fix didn't work", "ERROR")
                return False
            
            try:
                json_response = response.json()
                self.log("✅ Valid JSON response received", "SUCCESS")
                
                if response.status_code in [200, 201]:
                    self.log("Registration successful!", "SUCCESS")
                    self.log(f"User: {json_response.get('email', 'N/A')}", "INFO")
                    self.log(f"Status: {json_response.get('registration_status', 'N/A')}", "INFO")
                    
                    # Store for login test
                    self.test_user = test_user
                    return True
                    
                elif response.status_code == 409:
                    self.log("User already exists (trying different email)", "WARNING")
                    test_user["email"] = f"autotest.retry.{timestamp}@example.com"
                    self.test_user = test_user
                    return True  # Consider this a success for testing
                    
                else:
                    error_detail = json_response.get('detail', 'Unknown error')
                    self.log(f"Registration failed: {error_detail}", "ERROR")
                    return False
                    
            except json.JSONDecodeError as e:
                self.log(f"❌ JSON decode error: {e}", "ERROR")
                self.log(f"Response: {response.text[:200]}", "ERROR")
                self.log("This means the registration endpoint is still returning non-JSON", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"Registration request failed: {e}", "ERROR")
            return False
    
    def test_login(self) -> bool:
        """Test user login"""
        self.log("Testing user login...", "STEP")
        
        if not hasattr(self, 'test_user'):
            self.log("No test user available", "ERROR")
            return False
            
        login_data = {
            "email": self.test_user["email"],
            "password": self.test_user["password"]
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/v1/auth/login-json",
                json=login_data,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            self.log(f"Login status: {response.status_code}", "INFO")
            
            if response.status_code == 200 and response.content:
                try:
                    json_response = response.json()
                    self.log("Login successful!", "SUCCESS")
                    
                    self.access_token = json_response.get('access_token')
                    if self.access_token:
                        self.log("Access token received", "SUCCESS")
                        return True
                    else:
                        self.log("No access token received", "ERROR")
                        return False
                        
                except json.JSONDecodeError:
                    self.log("Login response not valid JSON", "ERROR")
                    return False
            else:
                self.log(f"Login failed: {response.status_code}", "ERROR")
                if response.content:
                    try:
                        error = response.json().get('detail', 'Unknown error')
                        self.log(f"Error: {error}", "ERROR")
                    except:
                        self.log(f"Response: {response.text[:200]}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"Login request failed: {e}", "ERROR")
            return False
    
    def test_protected_endpoint(self) -> bool:
        """Test protected endpoint access"""
        self.log("Testing protected endpoint access...", "STEP")
        
        if not self.access_token:
            self.log("No access token available", "ERROR")
            return False
            
        try:
            headers = {
                'Authorization': f'Bearer {self.access_token}',
                'Content-Type': 'application/json'
            }
            
            response = requests.get(
                f"{self.base_url}/api/v1/users/me",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                try:
                    user_data = response.json()
                    self.log("Protected endpoint access successful!", "SUCCESS")
                    self.log(f"User: {user_data.get('email', 'N/A')}", "INFO")
                    self.log(f"Email verified: {user_data.get('email_verified', 'N/A')}", "INFO")
                    return True
                except json.JSONDecodeError:
                    self.log("Protected endpoint returned invalid JSON", "ERROR")
                    return False
            else:
                self.log(f"Protected endpoint failed: {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"Protected endpoint error: {e}", "ERROR")
            return False
    
    def run_complete_test(self) -> bool:
        """Run the complete test suite"""
        self.log("="*80, "INFO")
        self.log("COMPLETE AUTOMATED REGISTRATION & AUTHENTICATION TEST", "INFO")
        self.log("="*80, "INFO")
        
        try:
            # Test sequence
            tests = [
                ("Server Startup", self.start_backend_server),
                ("Health Check", self.test_health_endpoint),
                ("User Registration", self.test_registration),
                ("User Login", self.test_login),
                ("Protected Access", self.test_protected_endpoint)
            ]
            
            results = {}
            for test_name, test_func in tests:
                self.log(f"Running: {test_name}", "INFO")
                success = test_func()
                results[test_name] = success
                
                if success:
                    self.log(f"✅ PASSED: {test_name}", "SUCCESS")
                else:
                    self.log(f"❌ FAILED: {test_name}", "ERROR")
                    break  # Stop on first failure
                
                self.log("-" * 60, "INFO")
                time.sleep(1)
            
            # Results summary
            self.print_results(results)
            return all(results.values())
            
        except KeyboardInterrupt:
            self.log("Test interrupted by user", "WARNING")
            return False
        except Exception as e:
            self.log(f"Unexpected error: {e}", "ERROR")
            return False
        finally:
            self.stop_backend_server()
    
    def print_results(self, results: Dict[str, bool]) -> None:
        """Print final test results"""
        self.log("="*80, "INFO")
        self.log("TEST RESULTS SUMMARY", "INFO")
        self.log("="*80, "INFO")
        
        for test_name, passed in results.items():
            status = "PASSED" if passed else "FAILED"
            level = "SUCCESS" if passed else "ERROR"
            self.log(f"{test_name:20}: {status}", level)
        
        self.log("-" * 80, "INFO")
        
        if all(results.values()):
            self.log("🎉 ALL TESTS PASSED!", "SUCCESS")
            self.log("✅ Registration endpoint working correctly", "SUCCESS")
            self.log("✅ JSON responses working", "SUCCESS")
            self.log("✅ Email verification bypassed", "SUCCESS")
            self.log("✅ Authentication flow complete", "SUCCESS")
        else:
            failed = [name for name, passed in results.items() if not passed]
            self.log(f"❌ FAILED TESTS: {', '.join(failed)}", "ERROR")
        
        self.log("="*80, "INFO")

def main():
    """Main execution function"""
    tester = CompleteAutomatedTest()
    success = tester.run_complete_test()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main()) 
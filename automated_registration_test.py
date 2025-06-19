#!/usr/bin/env python3
"""
Automated test for fixed registration and authentication endpoints
"""

import requests
import json
import time
import sys
from datetime import datetime
from typing import Optional, Dict, Any

class AutomatedRegistrationTest:
    def __init__(self):
        self.base_url = "http://127.0.0.1:8000"
        self.test_results = {
            "health_check": False,
            "registration": False,
            "login": False,
            "protected_endpoint": False,
            "overall_success": False
        }
        self.access_token: Optional[str] = None
        
    def log(self, message: str, level: str = "INFO") -> None:
        """Log test progress"""
        timestamp = datetime.now().strftime('%H:%M:%S')
        symbols = {
            "INFO": "ℹ️",
            "SUCCESS": "✅",
            "ERROR": "❌",
            "WARNING": "⚠️"
        }
        symbol = symbols.get(level, "ℹ️")
        print(f"{timestamp} [{level}] {symbol} {message}")
        
    def check_server_health(self) -> bool:
        """Check if the backend server is running and healthy"""
        self.log("Checking server health...")
        try:
            response = requests.get(f"{self.base_url}/health", timeout=5)
            if response.status_code == 200:
                self.log("Server is healthy and running", "SUCCESS")
                self.test_results["health_check"] = True
                return True
            else:
                self.log(f"Server health check failed: {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"Cannot connect to server: {e}", "ERROR")
            return False
    
    def test_registration(self) -> bool:
        """Test user registration with the fixed endpoint"""
        self.log("Testing user registration...")
        
        # Generate unique email for this test run
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
            
            self.log(f"Registration response: {response.status_code}")
            
            # Check if we got a response
            if not response.content:
                self.log("Empty response received from registration", "ERROR")
                return False
            
            # Try to parse JSON
            try:
                json_response = response.json()
                self.log("Valid JSON response received", "SUCCESS")
                
                if response.status_code in [200, 201]:
                    self.log("Registration successful!", "SUCCESS")
                    self.log(f"User ID: {json_response.get('id', 'N/A')}")
                    self.log(f"Email: {json_response.get('email', 'N/A')}")
                    self.log(f"Status: {json_response.get('registration_status', 'N/A')}")
                    self.test_results["registration"] = True
                    
                    # Store user data for login test
                    self.test_user_email = test_user["email"]
                    self.test_user_password = test_user["password"]
                    return True
                    
                elif response.status_code == 409:
                    self.log("User already exists (retrying with different email)", "WARNING")
                    # Try with a different email
                    test_user["email"] = f"autotest.retry.{timestamp}@example.com"
                    return self.test_registration()  # Recursive retry
                    
                else:
                    self.log(f"Registration failed: {json_response.get('detail', 'Unknown error')}", "ERROR")
                    return False
                    
            except json.JSONDecodeError as e:
                self.log(f"JSON decode error: {e}", "ERROR")
                self.log(f"Response content: {response.text[:300]}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"Registration request failed: {e}", "ERROR")
            return False
    
    def test_login(self) -> bool:
        """Test login with the registered user"""
        if not hasattr(self, 'test_user_email'):
            self.log("No test user available for login", "ERROR")
            return False
            
        self.log("Testing user login...")
        
        login_data = {
            "email": self.test_user_email,
            "password": self.test_user_password
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/v1/auth/login-json",
                json=login_data,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            self.log(f"Login response: {response.status_code}")
            
            if response.content and response.status_code == 200:
                try:
                    json_response = response.json()
                    self.log("Login successful!", "SUCCESS")
                    
                    # Extract and store access token
                    self.access_token = json_response.get('access_token')
                    if self.access_token:
                        self.log("Access token received", "SUCCESS")
                        self.log(f"Token type: {json_response.get('token_type', 'N/A')}")
                        self.log(f"Expires in: {json_response.get('expires_in', 'N/A')} seconds")
                        self.test_results["login"] = True
                        return True
                    else:
                        self.log("No access token in response", "ERROR")
                        return False
                        
                except json.JSONDecodeError as e:
                    self.log(f"Login JSON decode error: {e}", "ERROR")
                    return False
            else:
                self.log(f"Login failed: {response.status_code}", "ERROR")
                if response.content:
                    try:
                        error_detail = response.json().get('detail', 'Unknown error')
                        self.log(f"Error details: {error_detail}", "ERROR")
                    except:
                        self.log(f"Error response: {response.text[:200]}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"Login request failed: {e}", "ERROR")
            return False
    
    def test_protected_endpoint(self) -> bool:
        """Test accessing a protected endpoint with the JWT token"""
        if not self.access_token:
            self.log("No access token available for protected endpoint test", "ERROR")
            return False
            
        self.log("Testing protected endpoint access...")
        
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
            
            self.log(f"Protected endpoint response: {response.status_code}")
            
            if response.status_code == 200:
                try:
                    user_data = response.json()
                    self.log("Protected endpoint access successful!", "SUCCESS")
                    self.log(f"User email: {user_data.get('email', 'N/A')}")
                    self.log(f"User role: {user_data.get('role', 'N/A')}")
                    self.log(f"Email verified: {user_data.get('email_verified', 'N/A')}")
                    self.test_results["protected_endpoint"] = True
                    return True
                except json.JSONDecodeError:
                    self.log("Protected endpoint returned invalid JSON", "ERROR")
                    return False
            else:
                self.log(f"Protected endpoint access failed: {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"Protected endpoint request failed: {e}", "ERROR")
            return False
    
    def run_complete_test(self) -> bool:
        """Run the complete automated test suite"""
        self.log("Starting automated registration and authentication test", "INFO")
        self.log("="*70, "INFO")
        
        # Test sequence
        tests = [
            ("Server Health Check", self.check_server_health),
            ("User Registration", self.test_registration),
            ("User Login", self.test_login),
            ("Protected Endpoint Access", self.test_protected_endpoint)
        ]
        
        all_passed = True
        for test_name, test_func in tests:
            self.log(f"Running: {test_name}", "INFO")
            success = test_func()
            if not success:
                all_passed = False
                self.log(f"FAILED: {test_name}", "ERROR")
                break
            else:
                self.log(f"PASSED: {test_name}", "SUCCESS")
            self.log("-" * 50, "INFO")
            time.sleep(1)  # Brief pause between tests
        
        # Final results
        self.test_results["overall_success"] = all_passed
        self.print_final_results()
        return all_passed
    
    def print_final_results(self) -> None:
        """Print comprehensive test results"""
        self.log("="*70, "INFO")
        self.log("AUTOMATED TEST RESULTS", "INFO")
        self.log("="*70, "INFO")
        
        results = [
            ("Health Check", self.test_results["health_check"]),
            ("Registration", self.test_results["registration"]),
            ("Login", self.test_results["login"]),
            ("Protected Access", self.test_results["protected_endpoint"]),
        ]
        
        for test_name, passed in results:
            status = "PASSED" if passed else "FAILED"
            level = "SUCCESS" if passed else "ERROR"
            self.log(f"{test_name:20}: {status}", level)
        
        self.log("-" * 70, "INFO")
        
        if self.test_results["overall_success"]:
            self.log("🎉 ALL TESTS PASSED! Registration and authentication working perfectly!", "SUCCESS")
            self.log("✅ Email verification bypass working", "SUCCESS")
            self.log("✅ JSON responses working correctly", "SUCCESS")
            self.log("✅ Complete authentication flow functional", "SUCCESS")
        else:
            failed_tests = [name for name, passed in results if not passed]
            self.log(f"❌ SOME TESTS FAILED: {', '.join(failed_tests)}", "ERROR")
            self.log("Check the error messages above for details", "ERROR")
        
        self.log("="*70, "INFO")

def main():
    """Main function to run the automated test"""
    tester = AutomatedRegistrationTest()
    
    try:
        success = tester.run_complete_test()
        return 0 if success else 1
    except KeyboardInterrupt:
        tester.log("Test interrupted by user", "WARNING")
        return 1
    except Exception as e:
        tester.log(f"Unexpected error during testing: {e}", "ERROR")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code) 
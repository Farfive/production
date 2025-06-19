#!/usr/bin/env python3
"""
Comprehensive Authentication Flow Testing Script
Creates test users and tests all authentication functionality until 100% success rate
"""

import requests
import json
import time
import sys
from datetime import datetime
from typing import Dict, Any, Optional, List
from dataclasses import dataclass

@dataclass
class TestResult:
    name: str
    success: bool
    status_code: Optional[int] = None
    response_data: Optional[Dict] = None
    error_message: Optional[str] = None
    duration: float = 0.0

class ComprehensiveAuthTester:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tokens = {}
        self.test_results: List[TestResult] = []
        
        # Test users with proper data
        self.test_users = {
            "client": {
                "email": "test.client@example.com",
                "password": "ClientSecure2024!",
                "first_name": "Test",
                "last_name": "Client",
                "role": "client",
                "company_name": "Test Client Company",
                "data_processing_consent": True,
                "marketing_consent": False
            },
            "manufacturer": {
                "email": "test.manufacturer@example.com", 
                "password": "ManufacturerSecure2024!",
                "first_name": "Test",
                "last_name": "Manufacturer",
                "role": "manufacturer",
                "company_name": "Test Manufacturing Co",
                "data_processing_consent": True,
                "marketing_consent": False
            }
        }

    def log(self, message: str, level: str = "INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def test_server_health(self) -> TestResult:
        """Test if server is running and healthy"""
        start_time = time.time()
        try:
            response = self.session.get(f"{self.base_url}/health", timeout=10)
            duration = time.time() - start_time
            
            if response.status_code == 200:
                return TestResult(
                    name="Server Health Check",
                    success=True,
                    status_code=response.status_code,
                    response_data=response.json(),
                    duration=duration
                )
            else:
                return TestResult(
                    name="Server Health Check",
                    success=False,
                    status_code=response.status_code,
                    error_message=f"Unexpected status code: {response.status_code}",
                    duration=duration
                )
        except Exception as e:
            return TestResult(
                name="Server Health Check",
                success=False,
                error_message=str(e),
                duration=time.time() - start_time
            )

    def create_test_user_directly(self, user_data: Dict[str, Any]) -> TestResult:
        """Create test user directly in database using backend script"""
        start_time = time.time()
        try:
            # Create user via registration endpoint
            response = self.session.post(
                f"{self.base_url}/api/v1/auth/register",
                json=user_data,
                timeout=10
            )
            duration = time.time() - start_time
            
            if response.status_code in [200, 201]:
                return TestResult(
                    name=f"Create User ({user_data['role']})",
                    success=True,
                    status_code=response.status_code,
                    response_data=response.json() if response.content else {},
                    duration=duration
                )
            elif response.status_code == 400:
                # User might already exist
                response_data = response.json() if response.content else {}
                if "already registered" in str(response_data).lower():
                    return TestResult(
                        name=f"Create User ({user_data['role']})",
                        success=True,  # User exists, that's fine
                        status_code=response.status_code,
                        response_data=response_data,
                        duration=duration
                    )
            
            return TestResult(
                name=f"Create User ({user_data['role']})",
                success=False,
                status_code=response.status_code,
                response_data=response.json() if response.content else {},
                error_message=f"Registration failed: {response.status_code}",
                duration=duration
            )
        except Exception as e:
            return TestResult(
                name=f"Create User ({user_data['role']})",
                success=False,
                error_message=str(e),
                duration=time.time() - start_time
            )

    def test_user_login(self, email: str, password: str, role: str) -> TestResult:
        """Test user login"""
        start_time = time.time()
        try:
            login_data = {
                "email": email,
                "password": password
            }
            
            response = self.session.post(
                f"{self.base_url}/api/v1/auth/login-json",
                json=login_data,
                timeout=10
            )
            duration = time.time() - start_time
            
            if response.status_code == 200:
                response_data = response.json()
                if "access_token" in response_data:
                    # Store token for later tests
                    self.tokens[role] = response_data["access_token"]
                    return TestResult(
                        name=f"Login ({role})",
                        success=True,
                        status_code=response.status_code,
                        response_data=response_data,
                        duration=duration
                    )
            
            return TestResult(
                name=f"Login ({role})",
                success=False,
                status_code=response.status_code,
                response_data=response.json() if response.content else {},
                error_message=f"Login failed: {response.status_code}",
                duration=duration
            )
        except Exception as e:
            return TestResult(
                name=f"Login ({role})",
                success=False,
                error_message=str(e),
                duration=time.time() - start_time
            )

    def test_protected_access(self, role: str) -> TestResult:
        """Test access to protected endpoints"""
        start_time = time.time()
        try:
            if role not in self.tokens:
                return TestResult(
                    name=f"Protected Access ({role})",
                    success=False,
                    error_message="No auth token available",
                    duration=0.0
                )
            
            headers = {"Authorization": f"Bearer {self.tokens[role]}"}
            response = self.session.get(
                f"{self.base_url}/api/v1/auth/me",
                headers=headers,
                timeout=10
            )
            duration = time.time() - start_time
            
            if response.status_code == 200:
                return TestResult(
                    name=f"Protected Access ({role})",
                    success=True,
                    status_code=response.status_code,
                    response_data=response.json(),
                    duration=duration
                )
            else:
                return TestResult(
                    name=f"Protected Access ({role})",
                    success=False,
                    status_code=response.status_code,
                    response_data=response.json() if response.content else {},
                    error_message=f"Protected access failed: {response.status_code}",
                    duration=duration
                )
        except Exception as e:
            return TestResult(
                name=f"Protected Access ({role})",
                success=False,
                error_message=str(e),
                duration=time.time() - start_time
            )

    def test_invalid_credentials(self) -> TestResult:
        """Test login with invalid credentials"""
        start_time = time.time()
        try:
            login_data = {
                "email": "invalid@example.com",
                "password": "WrongPassword123!"
            }
            
            response = self.session.post(
                f"{self.base_url}/api/v1/auth/login-json",
                json=login_data,
                timeout=10
            )
            duration = time.time() - start_time
            
            # Should return 401 for invalid credentials
            if response.status_code == 401:
                return TestResult(
                    name="Invalid Credentials Test",
                    success=True,
                    status_code=response.status_code,
                    response_data=response.json() if response.content else {},
                    duration=duration
                )
            else:
                return TestResult(
                    name="Invalid Credentials Test",
                    success=False,
                    status_code=response.status_code,
                    error_message=f"Expected 401, got {response.status_code}",
                    duration=duration
                )
        except Exception as e:
            return TestResult(
                name="Invalid Credentials Test",
                success=False,
                error_message=str(e),
                duration=time.time() - start_time
            )

    def test_token_validation(self) -> TestResult:
        """Test token validation with invalid token"""
        start_time = time.time()
        try:
            headers = {"Authorization": "Bearer invalid_token_12345"}
            response = self.session.get(
                f"{self.base_url}/api/v1/auth/me",
                headers=headers,
                timeout=10
            )
            duration = time.time() - start_time
            
            # Should return 401 for invalid token
            if response.status_code == 401:
                return TestResult(
                    name="Invalid Token Test",
                    success=True,
                    status_code=response.status_code,
                    response_data=response.json() if response.content else {},
                    duration=duration
                )
            else:
                return TestResult(
                    name="Invalid Token Test",
                    success=False,
                    status_code=response.status_code,
                    error_message=f"Expected 401, got {response.status_code}",
                    duration=duration
                )
        except Exception as e:
            return TestResult(
                name="Invalid Token Test",
                success=False,
                error_message=str(e),
                duration=time.time() - start_time
            )

    def run_comprehensive_test(self) -> Dict[str, Any]:
        """Run all authentication tests"""
        self.log("🚀 Starting Comprehensive Authentication Flow Test")
        
        # 1. Test server health
        self.log("Testing server health...")
        result = self.test_server_health()
        self.test_results.append(result)
        if not result.success:
            self.log(f"❌ Server health check failed: {result.error_message}", "ERROR")
            return self.generate_report()
        self.log("✅ Server is healthy")
        
        # 2. Create test users (they should already exist)
        self.log("Creating test users...")
        for role, user_data in self.test_users.items():
            result = self.create_test_user_directly(user_data)
            self.test_results.append(result)
            
            if result.success:
                self.log(f"✅ User {role} created/exists")
            else:
                self.log(f"❌ User {role} creation failed: {result.error_message}")
        
        # 3. Test user logins
        self.log("Testing user logins...")
        for role, user_data in self.test_users.items():
            result = self.test_user_login(user_data["email"], user_data["password"], role)
            self.test_results.append(result)
            
            if result.success:
                self.log(f"✅ Login successful for {role}")
            else:
                self.log(f"❌ Login failed for {role}: {result.error_message}")
        
        # 4. Test protected access
        self.log("Testing protected access...")
        for role in self.test_users.keys():
            result = self.test_protected_access(role)
            self.test_results.append(result)
            
            if result.success:
                self.log(f"✅ Protected access successful for {role}")
            else:
                self.log(f"❌ Protected access failed for {role}: {result.error_message}")
        
        # 5. Test invalid credentials
        self.log("Testing invalid credentials...")
        result = self.test_invalid_credentials()
        self.test_results.append(result)
        
        if result.success:
            self.log("✅ Invalid credentials properly rejected")
        else:
            self.log(f"❌ Invalid credentials test failed: {result.error_message}")
        
        # 6. Test invalid token
        self.log("Testing invalid token...")
        result = self.test_token_validation()
        self.test_results.append(result)
        
        if result.success:
            self.log("✅ Invalid token properly rejected")
        else:
            self.log(f"❌ Invalid token test failed: {result.error_message}")
        
        return self.generate_report()

    def generate_report(self) -> Dict[str, Any]:
        """Generate comprehensive test report"""
        total_tests = len(self.test_results)
        successful_tests = sum(1 for result in self.test_results if result.success)
        success_rate = (successful_tests / total_tests * 100) if total_tests > 0 else 0
        
        report = {
            "timestamp": datetime.now().isoformat(),
            "total_tests": total_tests,
            "successful_tests": successful_tests,
            "failed_tests": total_tests - successful_tests,
            "success_rate": success_rate,
            "tests": [
                {
                    "name": result.name,
                    "success": result.success,
                    "status_code": result.status_code,
                    "error_message": result.error_message,
                    "duration": result.duration
                }
                for result in self.test_results
            ]
        }
        
        # Print summary
        print("\n" + "="*60)
        print("📊 COMPREHENSIVE AUTHENTICATION TEST RESULTS")
        print("="*60)
        print(f"Total Tests: {total_tests}")
        print(f"✅ Successful: {successful_tests}")
        print(f"❌ Failed: {total_tests - successful_tests}")
        print(f"📈 Success Rate: {success_rate:.1f}%")
        print(f"⏱️ Total Duration: {sum(r.duration for r in self.test_results):.2f}s")
        
        if success_rate == 100:
            print("\n🎉 PERFECT! 100% SUCCESS RATE ACHIEVED!")
            print("✅ Authentication system is fully operational!")
        elif success_rate >= 90:
            print(f"\n🎯 EXCELLENT! {success_rate:.1f}% success rate")
            print("⚠️ Minor issues remaining:")
        else:
            print(f"\n⚠️ {success_rate:.1f}% success rate - issues need attention:")
        
        # Show failed tests
        failed_tests = [r for r in self.test_results if not r.success]
        for result in failed_tests:
            print(f"   ❌ {result.name}: {result.error_message}")
        
        return report

def main():
    """Main test execution"""
    tester = ComprehensiveAuthTester()
    report = tester.run_comprehensive_test()
    
    # Save detailed report
    with open("auth_test_report.json", "w") as f:
        json.dump(report, f, indent=2)
    
    print(f"\n📄 Detailed report saved to: auth_test_report.json")
    
    # Exit with appropriate code
    if report["success_rate"] == 100:
        sys.exit(0)  # Success
    else:
        sys.exit(1)  # Some tests failed

if __name__ == "__main__":
    main() 
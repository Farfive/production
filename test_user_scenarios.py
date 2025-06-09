#!/usr/bin/env python3
"""
🧪 MANUFACTURING PLATFORM - USER SCENARIOS & FUNCTIONALITY TESTS
Test real user workflows and platform functionality
"""

import requests
import json
import time
import sys
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

# Test Configuration
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api/v1"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    PURPLE = '\033[95m'
    CYAN = '\033[96m'
    WHITE = '\033[97m'
    BOLD = '\033[1m'
    END = '\033[0m'

class PlatformTester:
    def __init__(self):
        self.session = requests.Session()
        self.tokens = {}
        self.users = {}
        self.test_results = []
        
    def log_test(self, test_name: str, status: str, details: str = ""):
        """Log test results"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        color = Colors.GREEN if status == "PASS" else Colors.RED if status == "FAIL" else Colors.YELLOW
        
        print(f"{color}[{timestamp}] {status}: {test_name}{Colors.END}")
        if details:
            print(f"    {Colors.CYAN}{details}{Colors.END}")
            
        self.test_results.append({
            "test": test_name,
            "status": status,
            "details": details,
            "timestamp": timestamp
        })

    def test_server_health(self) -> bool:
        """Test if the server is running and healthy"""
        try:
            response = self.session.get(f"{BASE_URL}/health", timeout=5)
            if response.status_code == 200:
                self.log_test("Server Health Check", "PASS", f"Server responding on {BASE_URL}")
                return True
            else:
                self.log_test("Server Health Check", "FAIL", f"Server returned {response.status_code}")
                return False
        except requests.exceptions.RequestException as e:
            self.log_test("Server Health Check", "FAIL", f"Connection error: {str(e)}")
            return False

    def test_api_documentation(self) -> bool:
        """Test if API documentation is accessible"""
        try:
            response = self.session.get(f"{BASE_URL}/docs", timeout=5)
            if response.status_code == 200:
                self.log_test("API Documentation", "PASS", "Swagger docs accessible at /docs")
                return True
            else:
                self.log_test("API Documentation", "FAIL", f"Docs returned {response.status_code}")
                return False
        except requests.exceptions.RequestException as e:
            self.log_test("API Documentation", "FAIL", f"Connection error: {str(e)}")
            return False

    def test_user_registration(self, user_type: str = "client") -> Optional[Dict]:
        """Test user registration workflow"""
        import random
        timestamp = int(time.time())
        random_id = random.randint(1000, 9999)
        test_user = {
            "email": f"test_{user_type}_{timestamp}_{random_id}@example.com",
            "password": "TestPassword123!",
            "first_name": "Test",
            "last_name": "User",
            "role": user_type.lower(),
            "phone": "+1234567890",
            "data_processing_consent": True,
            "marketing_consent": False,
            "company_name": f"Test {user_type.title()} Company"
        }
        
        try:
            response = self.session.post(
                f"{API_BASE}/auth/register",
                json=test_user,
                timeout=10
            )
            
            if response.status_code == 201:
                user_data = response.json()
                self.users[user_type] = {**test_user, **user_data}
                self.log_test(f"User Registration ({user_type})", "PASS", 
                            f"User created with ID: {user_data.get('id', 'N/A')}")
                return user_data
            else:
                try:
                    error_data = response.json() if response.content else {}
                    error_detail = error_data.get('detail', error_data.get('message', 'Unknown error'))
                except:
                    error_detail = response.text if response.content else 'No response content'
                self.log_test(f"User Registration ({user_type})", "FAIL", 
                            f"Status: {response.status_code}, Error: {error_detail}")
                return None
                
        except requests.exceptions.RequestException as e:
            self.log_test(f"User Registration ({user_type})", "FAIL", f"Connection error: {str(e)}")
            return None

    def test_user_login(self, user_type: str) -> Optional[str]:
        """Test user login workflow"""
        if user_type not in self.users:
            self.log_test(f"User Login ({user_type})", "SKIP", "User not registered")
            return None
            
        user = self.users[user_type]
        login_data = {
            "username": user["email"],  # FastAPI OAuth2 uses 'username' field
            "password": user["password"]
        }
        
        try:
            response = self.session.post(
                f"{API_BASE}/auth/login",
                data=login_data,  # OAuth2 expects form data
                timeout=10
            )
            
            if response.status_code == 200:
                token_data = response.json()
                access_token = token_data.get("access_token")
                if access_token:
                    self.tokens[user_type] = access_token
                    self.session.headers.update({"Authorization": f"Bearer {access_token}"})
                    self.log_test(f"User Login ({user_type})", "PASS", "Authentication successful")
                    return access_token
                else:
                    self.log_test(f"User Login ({user_type})", "FAIL", "No access token in response")
                    return None
            else:
                error_detail = response.json().get('detail', 'Unknown error') if response.content else 'No response content'
                self.log_test(f"User Login ({user_type})", "FAIL", 
                            f"Status: {response.status_code}, Error: {error_detail}")
                return None
                
        except requests.exceptions.RequestException as e:
            self.log_test(f"User Login ({user_type})", "FAIL", f"Connection error: {str(e)}")
            return None

    def test_protected_endpoint(self, user_type: str) -> bool:
        """Test access to protected endpoints"""
        if user_type not in self.tokens:
            self.log_test(f"Protected Endpoint Access ({user_type})", "SKIP", "No auth token")
            return False
            
        headers = {"Authorization": f"Bearer {self.tokens[user_type]}"}
        
        try:
            response = self.session.get(
                f"{API_BASE}/auth/me",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                user_data = response.json()
                self.log_test(f"Protected Endpoint Access ({user_type})", "PASS", 
                            f"User profile retrieved: {user_data.get('email', 'N/A')}")
                return True
            else:
                error_detail = response.json().get('detail', 'Unknown error') if response.content else 'No response content'
                self.log_test(f"Protected Endpoint Access ({user_type})", "FAIL", 
                            f"Status: {response.status_code}, Error: {error_detail}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_test(f"Protected Endpoint Access ({user_type})", "FAIL", f"Connection error: {str(e)}")
            return False

    def test_order_creation(self) -> Optional[Dict]:
        """Test order creation workflow"""
        if "client" not in self.tokens:
            self.log_test("Order Creation", "SKIP", "No client authentication")
            return None
            
        order_data = {
            "title": "Test Manufacturing Order",
            "description": "Test order for platform functionality testing",
            "category": "ELECTRONICS",
            "quantity": 100,
            "budget": 5000.00,
            "currency": "USD",
            "deadline": (datetime.now() + timedelta(days=30)).isoformat(),
            "requirements": {
                "material": "Aluminum",
                "finish": "Anodized",
                "tolerance": "±0.1mm"
            },
            "delivery_address": {
                "street": "123 Test Street",
                "city": "Test City",
                "state": "TS",
                "postal_code": "12345",
                "country": "US"
            }
        }
        
        headers = {"Authorization": f"Bearer {self.tokens['client']}"}
        
        try:
            response = self.session.post(
                f"{API_BASE}/orders/",
                json=order_data,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 201:
                order = response.json()
                self.log_test("Order Creation", "PASS", 
                            f"Order created with ID: {order.get('id', 'N/A')}")
                return order
            else:
                error_detail = response.json().get('detail', 'Unknown error') if response.content else 'No response content'
                self.log_test("Order Creation", "FAIL", 
                            f"Status: {response.status_code}, Error: {error_detail}")
                return None
                
        except requests.exceptions.RequestException as e:
            self.log_test("Order Creation", "FAIL", f"Connection error: {str(e)}")
            return None

    def test_order_listing(self) -> bool:
        """Test order listing functionality"""
        if "client" not in self.tokens:
            self.log_test("Order Listing", "SKIP", "No client authentication")
            return False
            
        headers = {"Authorization": f"Bearer {self.tokens['client']}"}
        
        try:
            response = self.session.get(
                f"{API_BASE}/orders/",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                orders = response.json()
                order_count = len(orders) if isinstance(orders, list) else orders.get('total', 0)
                self.log_test("Order Listing", "PASS", 
                            f"Retrieved {order_count} orders")
                return True
            else:
                error_detail = response.json().get('detail', 'Unknown error') if response.content else 'No response content'
                self.log_test("Order Listing", "FAIL", 
                            f"Status: {response.status_code}, Error: {error_detail}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_test("Order Listing", "FAIL", f"Connection error: {str(e)}")
            return False

    def test_intelligent_matching(self) -> bool:
        """Test intelligent matching functionality"""
        if "client" not in self.tokens:
            self.log_test("Intelligent Matching", "SKIP", "No client authentication")
            return False
            
        headers = {"Authorization": f"Bearer {self.tokens['client']}"}
        
        try:
            response = self.session.get(
                f"{API_BASE}/matching/recommendations",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                recommendations = response.json()
                rec_count = len(recommendations) if isinstance(recommendations, list) else 0
                self.log_test("Intelligent Matching", "PASS", 
                            f"Retrieved {rec_count} recommendations")
                return True
            else:
                error_detail = response.json().get('detail', 'Unknown error') if response.content else 'No response content'
                self.log_test("Intelligent Matching", "FAIL", 
                            f"Status: {response.status_code}, Error: {error_detail}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_test("Intelligent Matching", "FAIL", f"Connection error: {str(e)}")
            return False

    def test_email_functionality(self) -> bool:
        """Test email functionality"""
        if "client" not in self.tokens:
            self.log_test("Email Functionality", "SKIP", "No client authentication")
            return False
            
        headers = {"Authorization": f"Bearer {self.tokens['client']}"}
        
        try:
            response = self.session.get(
                f"{API_BASE}/emails/templates",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                templates = response.json()
                template_count = len(templates) if isinstance(templates, list) else 0
                self.log_test("Email Functionality", "PASS", 
                            f"Retrieved {template_count} email templates")
                return True
            else:
                error_detail = response.json().get('detail', 'Unknown error') if response.content else 'No response content'
                self.log_test("Email Functionality", "FAIL", 
                            f"Status: {response.status_code}, Error: {error_detail}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_test("Email Functionality", "FAIL", f"Connection error: {str(e)}")
            return False

    def test_performance_monitoring(self) -> bool:
        """Test performance monitoring endpoints"""
        if "client" not in self.tokens:
            self.log_test("Performance Monitoring", "SKIP", "No client authentication")
            return False
            
        headers = {"Authorization": f"Bearer {self.tokens['client']}"}
        
        try:
            response = self.session.get(
                f"{API_BASE}/performance/metrics",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                metrics = response.json()
                self.log_test("Performance Monitoring", "PASS", 
                            f"Performance metrics retrieved")
                return True
            else:
                error_detail = response.json().get('detail', 'Unknown error') if response.content else 'No response content'
                self.log_test("Performance Monitoring", "FAIL", 
                            f"Status: {response.status_code}, Error: {error_detail}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_test("Performance Monitoring", "FAIL", f"Connection error: {str(e)}")
            return False

    def run_comprehensive_tests(self):
        """Run all user scenario tests"""
        print(f"\n{Colors.BOLD}{Colors.BLUE}🧪 MANUFACTURING PLATFORM - USER SCENARIOS TEST{Colors.END}")
        print(f"{Colors.CYAN}Testing real user workflows and functionality...{Colors.END}\n")
        
        # Basic connectivity tests
        print(f"{Colors.YELLOW}📡 CONNECTIVITY TESTS{Colors.END}")
        if not self.test_server_health():
            print(f"{Colors.RED}❌ Server not accessible. Please start the backend server.{Colors.END}")
            return False
            
        self.test_api_documentation()
        
        # User workflow tests
        print(f"\n{Colors.YELLOW}👥 USER WORKFLOW TESTS{Colors.END}")
        
        # Test client user workflow
        client_user = self.test_user_registration("client")
        if client_user:
            self.test_user_login("client")
            self.test_protected_endpoint("client")
        
        # Test manufacturer user workflow
        manufacturer_user = self.test_user_registration("manufacturer")
        if manufacturer_user:
            self.test_user_login("manufacturer")
            self.test_protected_endpoint("manufacturer")
        
        # Feature functionality tests
        print(f"\n{Colors.YELLOW}🔧 FEATURE FUNCTIONALITY TESTS{Colors.END}")
        self.test_order_creation()
        self.test_order_listing()
        self.test_intelligent_matching()
        self.test_email_functionality()
        self.test_performance_monitoring()
        
        # Generate test report
        self.generate_test_report()
        
        return True

    def generate_test_report(self):
        """Generate comprehensive test report"""
        print(f"\n{Colors.BOLD}{Colors.PURPLE}📊 TEST RESULTS SUMMARY{Colors.END}")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["status"] == "PASS")
        failed = sum(1 for result in self.test_results if result["status"] == "FAIL")
        skipped = sum(1 for result in self.test_results if result["status"] == "SKIP")
        total = len(self.test_results)
        
        print(f"{Colors.GREEN}✅ PASSED: {passed}{Colors.END}")
        print(f"{Colors.RED}❌ FAILED: {failed}{Colors.END}")
        print(f"{Colors.YELLOW}⏭️  SKIPPED: {skipped}{Colors.END}")
        print(f"{Colors.CYAN}📊 TOTAL: {total}{Colors.END}")
        
        success_rate = (passed / total * 100) if total > 0 else 0
        print(f"\n{Colors.BOLD}Success Rate: {success_rate:.1f}%{Colors.END}")
        
        if failed == 0:
            print(f"\n{Colors.GREEN}{Colors.BOLD}🎉 ALL FUNCTIONAL TESTS PASSED!{Colors.END}")
            print(f"{Colors.GREEN}The platform is working correctly for user scenarios.{Colors.END}")
        else:
            print(f"\n{Colors.RED}{Colors.BOLD}⚠️  SOME TESTS FAILED{Colors.END}")
            print(f"{Colors.RED}Please review the failed tests above.{Colors.END}")
        
        # Detailed results
        print(f"\n{Colors.BOLD}📋 DETAILED TEST RESULTS:{Colors.END}")
        for result in self.test_results:
            status_color = Colors.GREEN if result["status"] == "PASS" else Colors.RED if result["status"] == "FAIL" else Colors.YELLOW
            print(f"  {status_color}[{result['timestamp']}] {result['status']}: {result['test']}{Colors.END}")
            if result["details"]:
                print(f"    {Colors.CYAN}{result['details']}{Colors.END}")

def main():
    """Main test execution"""
    print(f"{Colors.BOLD}{Colors.BLUE}🚀 Starting Manufacturing Platform User Scenario Tests...{Colors.END}\n")
    
    tester = PlatformTester()
    
    try:
        tester.run_comprehensive_tests()
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}⚠️  Tests interrupted by user{Colors.END}")
    except Exception as e:
        print(f"\n{Colors.RED}❌ Test execution failed: {str(e)}{Colors.END}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main()) 
#!/usr/bin/env python3
"""
Comprehensive API Testing for Manufacturing Platform
Tests all major functionalities including authentication, orders, matching, and more
"""

import requests
import json
import time
from datetime import datetime, timedelta
import random

class ManufacturingPlatformTester:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api/v1"
        self.session = requests.Session()
        self.tokens = {}
        self.users = {}
        self.orders = []
        self.results = {
            "total_tests": 0,
            "passed": 0,
            "failed": 0,
            "test_details": []
        }

    def log_result(self, test_name, success, details="", response_time=0):
        """Log test result"""
        self.results["total_tests"] += 1
        if success:
            self.results["passed"] += 1
            status = "✅ PASS"
        else:
            self.results["failed"] += 1
            status = "❌ FAIL"
        
        result = {
            "test": test_name,
            "status": "PASS" if success else "FAIL",
            "details": details,
            "response_time": response_time
        }
        self.results["test_details"].append(result)
        
        print(f"{status} {test_name}")
        if details:
            print(f"   {details}")
        if response_time > 0:
            print(f"   Response time: {response_time:.3f}s")
        print()

    def make_request(self, method, endpoint, **kwargs):
        """Make HTTP request with error handling"""
        start_time = time.time()
        
        try:
            if endpoint.startswith('/'):
                url = f"{self.api_url}{endpoint}"
            else:
                url = f"{self.base_url}/{endpoint}"
            
            # Set default timeout
            if 'timeout' not in kwargs:
                kwargs['timeout'] = 30
            
            response = self.session.request(method, url, **kwargs)
            response_time = time.time() - start_time
            
            return response, response_time
            
        except requests.exceptions.RequestException as e:
            response_time = time.time() - start_time
            print(f"Request error: {e}")
            return None, response_time

    def test_basic_connectivity(self):
        """Test basic API connectivity"""
        print("🔍 Testing Basic Connectivity")
        print("-" * 40)
        
        # Test root endpoint
        response, response_time = self.make_request("GET", "")
        success = response is not None and response.status_code == 200
        self.log_result("Root Endpoint", success, 
                       f"Status: {response.status_code if response else 'No response'}", 
                       response_time)
        
        # Test health endpoint
        response, response_time = self.make_request("GET", "health")
        success = response is not None and response.status_code == 200
        if success and response:
            health_data = response.json()
            details = f"Service: {health_data.get('service', 'Unknown')}, Status: {health_data.get('status', 'Unknown')}"
        else:
            details = f"Status: {response.status_code if response else 'No response'}"
        self.log_result("Health Check", success, details, response_time)
        
        # Test performance health
        response, response_time = self.make_request("GET", "/performance/health")
        success = response is not None and response.status_code == 200
        self.log_result("Performance Health", success, 
                       f"Status: {response.status_code if response else 'No response'}", 
                       response_time)

    def test_authentication_system(self):
        """Test complete authentication system"""
        print("🔐 Testing Authentication System")
        print("-" * 40)
        
        # Test client registration
        client_data = {
            "email": f"testclient_{int(time.time())}@example.com",
            "password": "SecurePassword123!",
            "first_name": "John",
            "last_name": "Doe",
            "company_name": "Test Manufacturing Co.",
            "nip": "1234567890",
            "phone": "+48123456789",
            "company_address": "ul. Testowa 123, 00-001 Warszawa",
            "role": "client",
            "data_processing_consent": True,
            "marketing_consent": False
        }
        
        response, response_time = self.make_request("POST", "/auth/register", json=client_data)
        success = response is not None and response.status_code == 200
        if success:
            self.users["client"] = response.json()
            details = f"User ID: {self.users['client']['id']}, Email: {self.users['client']['email']}"
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            details = f"Status: {response.status_code if response else 'No response'}, Error: {error_msg}"
        self.log_result("Client Registration", success, details, response_time)
        
        # Test manufacturer registration
        manufacturer_data = {
            "email": f"testmanufacturer_{int(time.time())}@example.com",
            "password": "SecurePassword123!",
            "first_name": "Jane",
            "last_name": "Smith",
            "company_name": "Advanced Manufacturing Solutions",
            "nip": "9876543210",
            "phone": "+48987654321",
            "company_address": "ul. Przemysłowa 456, 00-002 Kraków",
            "role": "manufacturer",
            "data_processing_consent": True,
            "marketing_consent": True
        }
        
        response, response_time = self.make_request("POST", "/auth/register", json=manufacturer_data)
        success = response is not None and response.status_code == 200
        if success:
            self.users["manufacturer"] = response.json()
            details = f"User ID: {self.users['manufacturer']['id']}, Email: {self.users['manufacturer']['email']}"
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            details = f"Status: {response.status_code if response else 'No response'}, Error: {error_msg}"
        self.log_result("Manufacturer Registration", success, details, response_time)
        
        # Test login for both users
        for role in ["client", "manufacturer"]:
            if role not in self.users:
                continue
                
            login_data = {
                "username": self.users[role]["email"],
                "password": "SecurePassword123!"
            }
            
            response, response_time = self.make_request("POST", "/auth/login", data=login_data)
            success = response is not None and response.status_code == 200
            if success:
                token_data = response.json()
                self.tokens[role] = token_data["access_token"]
                details = f"Token received, expires: {token_data.get('expires_in', 'Unknown')}s"
            else:
                error_msg = response.json().get("detail", "Unknown error") if response else "No response"
                details = f"Status: {response.status_code if response else 'No response'}, Error: {error_msg}"
            self.log_result(f"{role.title()} Login", success, details, response_time)
        
        # Test getting current user info
        for role in ["client", "manufacturer"]:
            if role not in self.tokens:
                continue
                
            headers = {"Authorization": f"Bearer {self.tokens[role]}"}
            response, response_time = self.make_request("GET", "/auth/me", headers=headers)
            success = response is not None and response.status_code == 200
            if success:
                user_data = response.json()
                details = f"User: {user_data['email']}, Role: {user_data['role']}"
            else:
                details = f"Status: {response.status_code if response else 'No response'}"
            self.log_result(f"{role.title()} Get Current User", success, details, response_time)

    def test_order_management(self):
        """Test order management functionality"""
        print("📦 Testing Order Management")
        print("-" * 40)
        
        if "client" not in self.tokens:
            self.log_result("Order Management", False, "No client authentication available")
            return
        
        headers = {"Authorization": f"Bearer {self.tokens['client']}"}
        
        # Test creating an order
        order_data = {
            "title": "Custom CNC Machined Components",
            "description": "We need precision CNC machined aluminum components for automotive application. High quality requirements with tight tolerances.",
            "technology": "CNC Machining",
            "material": "Aluminum 6061-T6",
            "quantity": 100,
            "budget_pln": 25000.00,
            "delivery_deadline": (datetime.now() + timedelta(days=45)).isoformat(),
            "priority": "high",
            "preferred_location": "Warsaw, Poland",
            "specifications": {
                "dimensions": "150x75x30mm",
                "tolerance": "±0.05mm",
                "finish": "Anodized Type II",
                "material_certificate": "Required",
                "quality_standard": "ISO 9001"
            }
        }
        
        response, response_time = self.make_request("POST", "/orders/", json=order_data, headers=headers)
        success = response is not None and response.status_code == 200
        if success:
            order = response.json()
            self.orders.append(order)
            details = f"Order ID: {order['id']}, Title: {order['title'][:50]}..."
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            details = f"Status: {response.status_code if response else 'No response'}, Error: {error_msg}"
        self.log_result("Create Order", success, details, response_time)
        
        # Test getting orders list
        response, response_time = self.make_request("GET", "/orders/", headers=headers)
        success = response is not None and response.status_code == 200
        if success:
            orders_data = response.json()
            orders_count = len(orders_data.get('orders', []))
            details = f"Found {orders_count} orders, Page: {orders_data.get('page', 1)}/{orders_data.get('total_pages', 1)}"
        else:
            details = f"Status: {response.status_code if response else 'No response'}"
        self.log_result("Get Orders List", success, details, response_time)
        
        # Test getting specific order
        if self.orders:
            order_id = self.orders[0]["id"]
            response, response_time = self.make_request("GET", f"/orders/{order_id}", headers=headers)
            success = response is not None and response.status_code == 200
            if success:
                order_detail = response.json()
                details = f"Order {order_id}: {order_detail['status']}, Budget: {order_detail['budget_pln']} PLN"
            else:
                details = f"Status: {response.status_code if response else 'No response'}"
            self.log_result("Get Order Details", success, details, response_time)
            
            # Test updating order
            update_data = {
                "description": f"UPDATED: {order_data['description']} [Updated at {datetime.now().strftime('%Y-%m-%d %H:%M')}]",
                "budget_pln": 27500.00
            }
            
            response, response_time = self.make_request("PUT", f"/orders/{order_id}", json=update_data, headers=headers)
            success = response is not None and response.status_code == 200
            if success:
                updated_order = response.json()
                details = f"Order updated, new budget: {updated_order['budget_pln']} PLN"
            else:
                details = f"Status: {response.status_code if response else 'No response'}"
            self.log_result("Update Order", success, details, response_time)

    def test_intelligent_matching(self):
        """Test intelligent matching system"""
        print("🧠 Testing Intelligent Matching")
        print("-" * 40)
        
        if not self.orders or "client" not in self.tokens:
            self.log_result("Intelligent Matching", False, "No orders or authentication available")
            return
        
        headers = {"Authorization": f"Bearer {self.tokens['client']}"}
        
        # Test find manufacturer matches
        matching_request = {
            "order_id": self.orders[0]["id"],
            "max_results": 10,
            "enable_fallback": True
        }
        
        response, response_time = self.make_request("POST", "/matching/find-matches", json=matching_request, headers=headers)
        success = response is not None and response.status_code == 200
        if success:
            matches_data = response.json()
            details = f"Found {matches_data.get('matches_found', 0)} matches, Processing time: {matches_data.get('processing_time_seconds', 0):.3f}s"
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            details = f"Status: {response.status_code if response else 'No response'}, Error: {error_msg}"
        self.log_result("Find Manufacturer Matches", success, details, response_time)
        
        # Test algorithm configuration
        response, response_time = self.make_request("GET", "/matching/algorithm-config", headers=headers)
        success = response is not None and response.status_code == 200
        if success:
            config_data = response.json()
            details = f"Algorithm configuration retrieved"
        else:
            details = f"Status: {response.status_code if response else 'No response'}"
        self.log_result("Get Algorithm Configuration", success, details, response_time)
        
        # Test matching statistics (admin-only, might fail)
        response, response_time = self.make_request("GET", "/matching/statistics", headers=headers)
        if response and response.status_code == 403:
            # Expected for non-admin users
            success = True
            details = "Correctly denied access (non-admin user)"
        elif response and response.status_code == 200:
            success = True
            details = "Statistics retrieved (admin access)"
        else:
            success = False
            details = f"Status: {response.status_code if response else 'No response'}"
        self.log_result("Matching Statistics Access Control", success, details, response_time)

    def test_email_automation(self):
        """Test email automation system"""
        print("📧 Testing Email Automation")
        print("-" * 40)
        
        if "client" not in self.tokens:
            self.log_result("Email Automation", False, "No authentication available")
            return
        
        headers = {"Authorization": f"Bearer {self.tokens['client']}"}
        
        # Test email templates (admin-only)
        response, response_time = self.make_request("GET", "/emails/templates", headers=headers)
        if response and response.status_code == 403:
            success = True
            details = "Correctly denied access (non-admin user)"
        elif response and response.status_code == 200:
            success = True
            templates = response.json()
            details = f"Templates retrieved: {len(templates) if isinstance(templates, list) else 'Unknown count'}"
        else:
            success = False
            details = f"Status: {response.status_code if response else 'No response'}"
        self.log_result("Email Templates Access Control", success, details, response_time)
        
        # Test unsubscribe endpoint (no auth required)
        unsubscribe_data = {
            "email": "test@example.com",
            "token": "test_unsubscribe_token"
        }
        
        response, response_time = self.make_request("POST", "/emails/unsubscribe", json=unsubscribe_data)
        # Accept various responses as the endpoint might handle invalid tokens differently
        success = response is not None and response.status_code in [200, 400, 404]
        if success:
            details = f"Unsubscribe endpoint accessible (Status: {response.status_code})"
        else:
            details = f"Status: {response.status_code if response else 'No response'}"
        self.log_result("Email Unsubscribe Endpoint", success, details, response_time)

    def test_performance_monitoring(self):
        """Test performance monitoring system"""
        print("📊 Testing Performance Monitoring")
        print("-" * 40)
        
        # Test cache performance
        response, response_time = self.make_request("GET", "/performance/cache")
        success = response is not None and response.status_code == 200
        if success:
            cache_data = response.json()
            details = f"Cache metrics retrieved"
        else:
            details = f"Status: {response.status_code if response else 'No response'}"
        self.log_result("Cache Performance Metrics", success, details, response_time)
        
        # Test performance summary
        response, response_time = self.make_request("GET", "/performance/summary?hours=1")
        success = response is not None and response.status_code == 200
        if success:
            summary_data = response.json()
            details = f"Performance summary for last 1 hour retrieved"
        else:
            details = f"Status: {response.status_code if response else 'No response'}"
        self.log_result("Performance Summary", success, details, response_time)
        
        # Test performance budgets
        response, response_time = self.make_request("GET", "/performance/budgets")
        success = response is not None and response.status_code == 200
        if success:
            budgets_data = response.json()
            details = f"Performance budgets retrieved"
        else:
            details = f"Status: {response.status_code if response else 'No response'}"
        self.log_result("Performance Budgets", success, details, response_time)
        
        # Test custom metric tracking
        metric_data = {
            "metric_name": "test_api_response_time",
            "value": 0.150,
            "tags": {"endpoint": "/api/test", "method": "GET"},
            "timestamp": datetime.now().isoformat()
        }
        
        response, response_time = self.make_request("POST", "/performance/track-metric", json=metric_data)
        success = response is not None and response.status_code == 200
        if success:
            details = f"Custom metric tracked successfully"
        else:
            details = f"Status: {response.status_code if response else 'No response'}"
        self.log_result("Track Custom Metric", success, details, response_time)

    def test_security_and_error_handling(self):
        """Test security features and error handling"""
        print("🛡️ Testing Security & Error Handling")
        print("-" * 40)
        
        # Test unauthorized access
        response, response_time = self.make_request("GET", "/orders/")
        success = response is not None and response.status_code == 401
        details = f"Correctly returned 401 for unauthorized access" if success else f"Status: {response.status_code if response else 'No response'}"
        self.log_result("Unauthorized Access Protection", success, details, response_time)
        
        # Test invalid endpoint
        response, response_time = self.make_request("GET", "/invalid-endpoint")
        success = response is not None and response.status_code == 404
        details = f"Correctly returned 404 for invalid endpoint" if success else f"Status: {response.status_code if response else 'No response'}"
        self.log_result("Invalid Endpoint Handling", success, details, response_time)
        
        # Test invalid data submission
        if "client" in self.tokens:
            headers = {"Authorization": f"Bearer {self.tokens['client']}"}
            invalid_order = {
                "title": "",  # Invalid: empty title
                "description": "Short",  # Invalid: too short
                "technology": "",  # Invalid: empty
                "material": "",  # Invalid: empty
                "quantity": -1,  # Invalid: negative
                "budget_pln": -100,  # Invalid: negative
                "delivery_deadline": "invalid-date"  # Invalid: bad date format
            }
            
            response, response_time = self.make_request("POST", "/orders/", json=invalid_order, headers=headers)
            success = response is not None and response.status_code == 422
            details = f"Correctly returned 422 for validation errors" if success else f"Status: {response.status_code if response else 'No response'}"
            self.log_result("Input Validation", success, details, response_time)
        
        # Test password reset flow
        reset_request = {
            "email": "nonexistent@example.com"
        }
        
        response, response_time = self.make_request("POST", "/auth/password-reset-request", json=reset_request)
        # Should handle gracefully whether email exists or not
        success = response is not None and response.status_code in [200, 404]
        details = f"Password reset request handled (Status: {response.status_code})"
        self.log_result("Password Reset Request", success, details, response_time)

    def run_load_test(self, requests_count=50):
        """Run a basic load test"""
        print("🔥 Running Basic Load Test")
        print("-" * 40)
        
        start_time = time.time()
        successful_requests = 0
        failed_requests = 0
        total_response_time = 0
        
        for i in range(requests_count):
            response, response_time = self.make_request("GET", "health")
            total_response_time += response_time
            
            if response and response.status_code == 200:
                successful_requests += 1
            else:
                failed_requests += 1
            
            if (i + 1) % 10 == 0:
                print(f"   Completed {i + 1}/{requests_count} requests...")
        
        total_time = time.time() - start_time
        avg_response_time = total_response_time / requests_count
        success_rate = (successful_requests / requests_count) * 100
        requests_per_second = requests_count / total_time
        
        success = success_rate >= 95  # 95% success rate threshold
        details = f"Success rate: {success_rate:.1f}%, Avg response: {avg_response_time:.3f}s, RPS: {requests_per_second:.1f}"
        self.log_result(f"Load Test ({requests_count} requests)", success, details, total_time)

    def generate_report(self):
        """Generate comprehensive test report"""
        print("\n" + "="*80)
        print("📋 COMPREHENSIVE TEST REPORT")
        print("="*80)
        
        success_rate = (self.results["passed"] / self.results["total_tests"]) * 100 if self.results["total_tests"] > 0 else 0
        
        print(f"📊 Test Summary:")
        print(f"   Total Tests: {self.results['total_tests']}")
        print(f"   Passed: {self.results['passed']} ✅")
        print(f"   Failed: {self.results['failed']} ❌")
        print(f"   Success Rate: {success_rate:.1f}%")
        
        if self.results["failed"] > 0:
            print(f"\n❌ Failed Tests:")
            for test in self.results["test_details"]:
                if test["status"] == "FAIL":
                    print(f"   - {test['test']}: {test['details']}")
        
        print(f"\n⚡ Performance Summary:")
        response_times = [t["response_time"] for t in self.results["test_details"] if t["response_time"] > 0]
        if response_times:
            avg_time = sum(response_times) / len(response_times)
            max_time = max(response_times)
            min_time = min(response_times)
            print(f"   Average Response Time: {avg_time:.3f}s")
            print(f"   Fastest Response: {min_time:.3f}s")
            print(f"   Slowest Response: {max_time:.3f}s")
        
        print(f"\n🎯 Test Coverage:")
        print(f"   ✓ Basic Connectivity")
        print(f"   ✓ Authentication System")
        print(f"   ✓ Order Management")
        print(f"   ✓ Intelligent Matching")
        print(f"   ✓ Email Automation")
        print(f"   ✓ Performance Monitoring")
        print(f"   ✓ Security & Error Handling")
        print(f"   ✓ Load Testing")
        
        print("\n" + "="*80)
        
        # Save detailed report
        with open("test_report.json", "w") as f:
            json.dump(self.results, f, indent=2)
        
        print("📄 Detailed report saved to: test_report.json")
        
        return success_rate

    def run_all_tests(self):
        """Execute all test suites"""
        print("🚀 MANUFACTURING PLATFORM - COMPREHENSIVE API TESTING")
        print("="*80)
        print(f"Testing API at: {self.base_url}")
        print(f"Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*80)
        
        try:
            self.test_basic_connectivity()
            self.test_authentication_system()
            self.test_order_management()
            self.test_intelligent_matching()
            self.test_email_automation()
            self.test_performance_monitoring()
            self.test_security_and_error_handling()
            self.run_load_test(50)  # 50 requests for load test
            
            success_rate = self.generate_report()
            
            if success_rate >= 80:
                print("🎉 All major systems are functioning correctly!")
                return 0
            elif success_rate >= 60:
                print("⚠️ Most systems working, some issues detected.")
                return 1
            else:
                print("🚨 Critical issues detected, system may not be production ready.")
                return 2
                
        except Exception as e:
            print(f"💥 Testing failed with critical error: {e}")
            return 3


def main():
    """Main execution function"""
    tester = ManufacturingPlatformTester()
    
    try:
        exit_code = tester.run_all_tests()
        exit(exit_code)
    except KeyboardInterrupt:
        print("\n⚠️ Testing interrupted by user")
        exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        exit(1)


if __name__ == "__main__":
    main() 
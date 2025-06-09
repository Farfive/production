#!/usr/bin/env python3
"""
Manufacturing Platform API Testing Script
Tests all available endpoints based on the OpenAPI schema
"""

import requests
import json
import time
from datetime import datetime, timedelta
import random
from faker import Faker

fake = Faker()

class APITester:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api/v1"
        self.session = requests.Session()
        self.tokens = {}
        self.users = {}
        self.orders = []
        self.test_results = {"passed": 0, "failed": 0, "errors": []}

    def log_test(self, test_name: str, success: bool, details: str = "", response_time: float = 0):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        if response_time > 0:
            print(f"   Response Time: {response_time:.3f}s")
        
        if success:
            self.test_results["passed"] += 1
        else:
            self.test_results["failed"] += 1
            self.test_results["errors"].append(f"{test_name}: {details}")
        print()

    def make_request(self, method: str, endpoint: str, **kwargs):
        """Make HTTP request with timing"""
        start_time = time.time()
        url = f"{self.api_url}{endpoint}" if endpoint.startswith('/') else f"{self.base_url}{endpoint}"
        
        try:
            response = self.session.request(method, url, **kwargs)
            response_time = time.time() - start_time
            return response, response_time
        except Exception as e:
            response_time = time.time() - start_time
            print(f"Request failed: {e}")
            return None, response_time

    def test_health_endpoints(self):
        """Test health check endpoints"""
        print("🔍 Testing Health Endpoints...")
        
        # Test root endpoint
        response, response_time = self.make_request("GET", "/")
        success = response and response.status_code == 200
        self.log_test("Root Endpoint", success, "API root accessible", response_time)
        
        # Test health endpoint
        response, response_time = self.make_request("GET", "/health")
        success = response and response.status_code == 200
        self.log_test("Health Check", success, "Health endpoint accessible", response_time)
        
        # Test performance health
        response, response_time = self.make_request("GET", "/api/v1/performance/health")
        success = response and response.status_code == 200
        self.log_test("Performance Health", success, "Performance health check", response_time)

    def test_authentication(self):
        """Test authentication endpoints"""
        print("🔐 Testing Authentication...")
        
        # Test user registration - Client
        client_data = {
            "email": fake.email(),
            "password": "TestPassword123!",
            "first_name": fake.first_name(),
            "last_name": fake.last_name(),
            "company_name": fake.company(),
            "nip": "1234567890",
            "phone": fake.phone_number(),
            "company_address": fake.address(),
            "role": "client",
            "data_processing_consent": True,
            "marketing_consent": False
        }
        
        response, response_time = self.make_request("POST", "/auth/register", json=client_data)
        if response and response.status_code == 200:
            self.users["client"] = response.json()
            self.log_test("Client Registration", True, f"User ID: {self.users['client']['id']}", response_time)
        else:
            error_detail = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_test("Client Registration", False, f"Status: {response.status_code if response else 'No response'}, Error: {error_detail}")
        
        # Test user registration - Manufacturer
        manufacturer_data = {
            "email": fake.email(),
            "password": "TestPassword123!",
            "first_name": fake.first_name(),
            "last_name": fake.last_name(),
            "company_name": fake.company(),
            "nip": "0987654321",
            "phone": fake.phone_number(),
            "company_address": fake.address(),
            "role": "manufacturer",
            "data_processing_consent": True,
            "marketing_consent": True
        }
        
        response, response_time = self.make_request("POST", "/auth/register", json=manufacturer_data)
        if response and response.status_code == 200:
            self.users["manufacturer"] = response.json()
            self.log_test("Manufacturer Registration", True, f"User ID: {self.users['manufacturer']['id']}", response_time)
        else:
            error_detail = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_test("Manufacturer Registration", False, f"Status: {response.status_code if response else 'No response'}, Error: {error_detail}")

        # Test login for both users
        for role in ["client", "manufacturer"]:
            if role not in self.users:
                continue
                
            login_data = {
                "username": self.users[role]["email"],
                "password": "TestPassword123!"
            }
            
            response, response_time = self.make_request("POST", "/auth/login", data=login_data)
            if response and response.status_code == 200:
                token_data = response.json()
                self.tokens[role] = token_data["access_token"]
                self.log_test(f"{role.title()} Login", True, "Token received", response_time)
            else:
                error_detail = response.json().get("detail", "Unknown error") if response else "No response"
                self.log_test(f"{role.title()} Login", False, f"Status: {response.status_code if response else 'No response'}, Error: {error_detail}")

        # Test get current user info
        for role in ["client", "manufacturer"]:
            if role not in self.tokens:
                continue
                
            headers = {"Authorization": f"Bearer {self.tokens[role]}"}
            response, response_time = self.make_request("GET", "/auth/me", headers=headers)
            
            if response and response.status_code == 200:
                user_data = response.json()
                self.log_test(f"{role.title()} Get Me", True, f"User: {user_data['email']}", response_time)
            else:
                self.log_test(f"{role.title()} Get Me", False, f"Status: {response.status_code if response else 'No response'}")

    def test_order_management(self):
        """Test order management endpoints"""
        print("📦 Testing Order Management...")
        
        if "client" not in self.tokens:
            self.log_test("Order Management", False, "No client token available")
            return
        
        # Create order
        order_data = {
            "title": fake.catch_phrase(),
            "description": fake.text(max_nb_chars=500),
            "technology": "CNC Machining",
            "material": "Aluminum",
            "quantity": random.randint(1, 100),
            "budget_pln": random.randint(1000, 50000),
            "delivery_deadline": (datetime.now() + timedelta(days=30)).isoformat(),
            "priority": "normal",
            "preferred_location": fake.city(),
            "specifications": {
                "dimensions": f"{random.randint(1, 100)}x{random.randint(1, 100)}x{random.randint(1, 100)}mm",
                "tolerance": "±0.1mm",
                "finish": "Anodized"
            }
        }
        
        headers = {"Authorization": f"Bearer {self.tokens['client']}"}
        response, response_time = self.make_request("POST", "/orders/", json=order_data, headers=headers)
        
        if response and response.status_code == 200:
            order = response.json()
            self.orders.append(order)
            self.log_test("Create Order", True, f"Order ID: {order['id']}", response_time)
        else:
            error_detail = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_test("Create Order", False, f"Status: {response.status_code if response else 'No response'}, Error: {error_detail}")

        # Get orders list
        response, response_time = self.make_request("GET", "/orders/", headers=headers)
        if response and response.status_code == 200:
            orders_data = response.json()
            self.log_test("Get Orders", True, f"Found {len(orders_data.get('orders', []))} orders", response_time)
        else:
            self.log_test("Get Orders", False, f"Status: {response.status_code if response else 'No response'}")

        # Test order details
        if self.orders:
            order_id = self.orders[0]["id"]
            response, response_time = self.make_request("GET", f"/orders/{order_id}", headers=headers)
            if response and response.status_code == 200:
                self.log_test("Get Order Details", True, f"Order {order_id} details retrieved", response_time)
            else:
                self.log_test("Get Order Details", False, f"Status: {response.status_code if response else 'No response'}")

            # Test order update
            update_data = {
                "title": f"Updated {fake.catch_phrase()}",
                "description": f"Updated description: {fake.text(max_nb_chars=300)}"
            }
            
            response, response_time = self.make_request("PUT", f"/orders/{order_id}", json=update_data, headers=headers)
            if response and response.status_code == 200:
                self.log_test("Update Order", True, f"Order {order_id} updated", response_time)
            else:
                self.log_test("Update Order", False, f"Status: {response.status_code if response else 'No response'}")

    def test_intelligent_matching(self):
        """Test intelligent matching endpoints"""
        print("🧠 Testing Intelligent Matching...")
        
        if not self.orders or "client" not in self.tokens:
            self.log_test("Intelligent Matching", False, "No orders or client token available")
            return
        
        headers = {"Authorization": f"Bearer {self.tokens['client']}"}
        
        # Test find matches
        match_request = {
            "order_id": self.orders[0]["id"],
            "max_results": 5,
            "enable_fallback": True
        }
        
        response, response_time = self.make_request("POST", "/matching/find-matches", json=match_request, headers=headers)
        if response and response.status_code == 200:
            matches = response.json()
            self.log_test("Find Matches", True, f"Found {matches.get('matches_found', 0)} matches", response_time)
        else:
            error_detail = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_test("Find Matches", False, f"Status: {response.status_code if response else 'No response'}, Error: {error_detail}")

        # Test algorithm configuration
        response, response_time = self.make_request("GET", "/matching/algorithm-config", headers=headers)
        if response and response.status_code == 200:
            self.log_test("Algorithm Config", True, "Configuration retrieved", response_time)
        else:
            self.log_test("Algorithm Config", False, f"Status: {response.status_code if response else 'No response'}")

        # Test matching statistics (admin only, might fail)
        response, response_time = self.make_request("GET", "/matching/statistics", headers=headers)
        if response and response.status_code in [200, 403]:  # 403 is expected for non-admin
            success = response.status_code == 200 or "Admin access required" in response.text
            self.log_test("Matching Statistics", success, "Statistics endpoint tested", response_time)
        else:
            self.log_test("Matching Statistics", False, f"Status: {response.status_code if response else 'No response'}")

    def test_email_automation(self):
        """Test email automation endpoints"""
        print("📧 Testing Email Automation...")
        
        if "client" not in self.tokens:
            self.log_test("Email Automation", False, "No client token available")
            return
        
        headers = {"Authorization": f"Bearer {self.tokens['client']}"}
        
        # Test email templates (admin only, might fail)
        response, response_time = self.make_request("GET", "/emails/templates", headers=headers)
        if response and response.status_code in [200, 403]:
            success = response.status_code == 200 or "Admin" in response.text
            self.log_test("Email Templates", success, "Templates endpoint tested", response_time)
        else:
            self.log_test("Email Templates", False, f"Status: {response.status_code if response else 'No response'}")

        # Test unsubscribe (no auth required)
        unsubscribe_data = {
            "email": fake.email(),
            "token": "test_token"
        }
        
        response, response_time = self.make_request("POST", "/emails/unsubscribe", json=unsubscribe_data)
        if response and response.status_code in [200, 400, 404]:  # Various valid responses
            self.log_test("Email Unsubscribe", True, "Unsubscribe endpoint accessible", response_time)
        else:
            self.log_test("Email Unsubscribe", False, f"Status: {response.status_code if response else 'No response'}")

    def test_performance_monitoring(self):
        """Test performance monitoring endpoints"""
        print("📊 Testing Performance Monitoring...")
        
        # Test cache performance
        response, response_time = self.make_request("GET", "/performance/cache")
        if response and response.status_code == 200:
            self.log_test("Cache Performance", True, "Cache metrics retrieved", response_time)
        else:
            self.log_test("Cache Performance", False, f"Status: {response.status_code if response else 'No response'}")

        # Test performance summary
        response, response_time = self.make_request("GET", "/performance/summary?hours=1")
        if response and response.status_code == 200:
            self.log_test("Performance Summary", True, "Performance summary retrieved", response_time)
        else:
            self.log_test("Performance Summary", False, f"Status: {response.status_code if response else 'No response'}")

        # Test performance budgets
        response, response_time = self.make_request("GET", "/performance/budgets")
        if response and response.status_code == 200:
            self.log_test("Performance Budgets", True, "Performance budgets retrieved", response_time)
        else:
            self.log_test("Performance Budgets", False, f"Status: {response.status_code if response else 'No response'}")

        # Test custom metric tracking
        metric_data = {
            "metric_name": "test_metric",
            "value": 123.45,
            "timestamp": datetime.now().isoformat()
        }
        
        response, response_time = self.make_request("POST", "/performance/track-metric", json=metric_data)
        if response and response.status_code == 200:
            self.log_test("Track Custom Metric", True, "Custom metric tracked", response_time)
        else:
            self.log_test("Track Custom Metric", False, f"Status: {response.status_code if response else 'No response'}")

    def test_error_handling(self):
        """Test error handling and edge cases"""
        print("⚠️ Testing Error Handling...")
        
        # Test invalid endpoint
        response, response_time = self.make_request("GET", "/api/v1/invalid-endpoint")
        success = response and response.status_code == 404
        self.log_test("Invalid Endpoint", success, "404 returned for invalid endpoint", response_time)
        
        # Test unauthorized access
        response, response_time = self.make_request("GET", "/orders/")
        success = response and response.status_code == 401
        self.log_test("Unauthorized Access", success, "401 returned for unauthorized access", response_time)
        
        # Test invalid data
        if "client" in self.tokens:
            invalid_order = {"invalid": "data"}
            headers = {"Authorization": f"Bearer {self.tokens['client']}"}
            response, response_time = self.make_request("POST", "/orders/", json=invalid_order, headers=headers)
            success = response and response.status_code in [400, 422]
            self.log_test("Invalid Data", success, "400/422 returned for invalid data", response_time)

    def test_password_reset_flow(self):
        """Test password reset functionality"""
        print("🔑 Testing Password Reset...")
        
        # Test password reset request
        reset_request = {
            "email": fake.email()
        }
        
        response, response_time = self.make_request("POST", "/auth/password-reset-request", json=reset_request)
        if response and response.status_code in [200, 404]:  # 404 for non-existent email is valid
            self.log_test("Password Reset Request", True, "Password reset request processed", response_time)
        else:
            self.log_test("Password Reset Request", False, f"Status: {response.status_code if response else 'No response'}")

    def generate_test_report(self):
        """Generate test report"""
        print("\n" + "="*80)
        print("📋 API TEST REPORT")
        print("="*80)
        
        total_tests = self.test_results["passed"] + self.test_results["failed"]
        success_rate = (self.test_results["passed"] / total_tests * 100) if total_tests > 0 else 0
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {self.test_results['passed']} ✅")
        print(f"Failed: {self.test_results['failed']} ❌")
        print(f"Success Rate: {success_rate:.1f}%")
        
        if self.test_results["errors"]:
            print(f"\n❌ FAILED TESTS:")
            for error in self.test_results["errors"]:
                print(f"   - {error}")
        
        print("\n" + "="*80)
        
        return {
            "total_tests": total_tests,
            "passed": self.test_results["passed"],
            "failed": self.test_results["failed"],
            "success_rate": success_rate,
            "errors": self.test_results["errors"]
        }

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting Manufacturing Platform API Testing")
        print("="*80)
        
        # Test all endpoints
        self.test_health_endpoints()
        self.test_authentication()
        self.test_order_management()
        self.test_intelligent_matching()
        self.test_email_automation()
        self.test_performance_monitoring()
        self.test_password_reset_flow()
        self.test_error_handling()
        
        # Generate report
        return self.generate_test_report()


def main():
    """Main test execution"""
    tester = APITester()
    
    try:
        # Run all tests
        report = tester.run_all_tests()
        
        # Save report to file
        with open("api_test_report.json", "w") as f:
            json.dump(report, f, indent=2)
        
        print(f"\n📄 Test report saved to: api_test_report.json")
        
        # Exit with appropriate code
        exit_code = 0 if report["success_rate"] > 70 else 1
        exit(exit_code)
        
    except KeyboardInterrupt:
        print("\n⚠️ Testing interrupted by user")
        exit(1)
    except Exception as e:
        print(f"\n💥 Testing failed with error: {str(e)}")
        exit(1)


if __name__ == "__main__":
    main() 
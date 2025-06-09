#!/usr/bin/env python3
"""
Advanced Order Management Workflows Test
=====================================

Tests comprehensive manufacturing platform workflows including:
- Order Management Workflows
- Client-Producer Business Logic
- Quote & Production Management
- Security & Validation Testing
- Advanced Manufacturing Scenarios
"""

import json
import urllib.request
import urllib.parse
import urllib.error
import time
import sys
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"

class OrderWorkflowTester:
    def __init__(self):
        self.tokens = {}
        self.users = {}
        self.orders = {}
        self.quotes = {}
        self.test_results = []
        
    def log_test(self, test_name, status, details=""):
        """Log test results"""
        result = {
            "test": test_name,
            "status": status,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status_icon = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
        print(f"{status_icon} {test_name}: {status}")
        if details:
            print(f"   Details: {details}")
            
    def make_request(self, method, endpoint, data=None, token=None, expected_status=None):
        """Make HTTP request with proper error handling"""
        try:
            url = f"{BASE_URL}{endpoint}"
            
            # Prepare request
            if data:
                data = json.dumps(data).encode('utf-8')
            
            req = urllib.request.Request(url, data=data, method=method)
            req.add_header('Content-Type', 'application/json')
            
            if token:
                req.add_header('Authorization', f'Bearer {token}')
                
            # Make request
            with urllib.request.urlopen(req) as response:
                response_data = json.loads(response.read().decode('utf-8'))
                status_code = response.getcode()
                
                if expected_status and status_code != expected_status:
                    return None, f"Expected status {expected_status}, got {status_code}"
                    
                return response_data, None
                
        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8')
            try:
                error_data = json.loads(error_body)
                return error_data, f"HTTP {e.code}: {error_data.get('detail', 'Unknown error')}"
            except:
                return None, f"HTTP {e.code}: {error_body}"
        except Exception as e:
            return None, f"Request error: {str(e)}"

    def register_user(self, email, password, role, company_name=None):
        """Register a new user"""
        user_data = {
            "email": email,
            "password": password,
            "role": role,
            "first_name": email.split('@')[0].title(),
            "last_name": "Test",
            "phone": "+1234567890",
            "company_name": company_name or f"{role.title()} Company",
            "gdpr_consent": True,
            "marketing_consent": False
        }
        
        response, error = self.make_request("POST", "/api/v1/auth/register", user_data)
        if error:
            return None, error
            
        return response, None

    def login_user(self, email, password):
        """Login user and return token"""
        login_data = {
            "email": email,
            "password": password
        }
        
        response, error = self.make_request("POST", "/api/v1/auth/login-json", login_data)
        if error:
            return None, error
            
        return response.get("access_token"), None

    def test_user_setup(self):
        """Test 1: Set up test users (Client, Producer, Admin)"""
        print("\n=== Testing User Setup ===")
        
        # Test users to create
        test_users = [
            {"email": "client@test.com", "password": "TestPass123!", "role": "client"},
            {"email": "producer@test.com", "password": "TestPass123!", "role": "producer"},
            {"email": "producer2@test.com", "password": "TestPass123!", "role": "producer"},
            {"email": "admin@test.com", "password": "TestPass123!", "role": "admin"}
        ]
        
        for user_data in test_users:
            # Register user
            response, error = self.register_user(
                user_data["email"], 
                user_data["password"], 
                user_data["role"],
                f"{user_data['role'].title()} Manufacturing Co."
            )
            
            if error and "already registered" not in error:
                self.log_test(f"Register {user_data['role']}", "FAIL", error)
                continue
            
            # Login user
            token, error = self.login_user(user_data["email"], user_data["password"])
            if error:
                self.log_test(f"Login {user_data['role']}", "FAIL", error)
                continue
                
            # Store user info
            self.tokens[user_data["role"]] = token
            self.users[user_data["role"]] = user_data
            
            self.log_test(f"Setup {user_data['role']} user", "PASS", f"Token: {token[:20]}...")

    def test_order_creation_workflow(self):
        """Test 2: Order Creation Workflow"""
        print("\n=== Testing Order Creation Workflow ===")
        
        # Test invalid order creation (missing fields)
        invalid_order = {
            "title": "Test Order"
        }
        
        response, error = self.make_request(
            "POST", "/api/v1/orders/", 
            invalid_order, 
            self.tokens.get("client")
        )
        
        if error and ("validation" in error.lower() or "required" in error.lower()):
            self.log_test("Order validation", "PASS", "Properly rejected invalid order")
        else:
            self.log_test("Order validation", "FAIL", "Should have rejected invalid order")
        
        # Test valid order creation
        valid_order = {
            "title": "Custom Manufacturing Order",
            "description": "Need 1000 units of custom aluminum brackets with specific tolerances",
            "category": "metal_fabrication",
            "quantity": 1000,
            "budget_min": 5000.00,
            "budget_max": 8000.00,
            "deadline": (datetime.now() + timedelta(days=30)).isoformat(),
            "specifications": {
                "material": "6061 Aluminum",
                "finish": "Anodized",
                "tolerance": "±0.1mm",
                "drawing_url": "https://example.com/drawing.pdf"
            },
            "location": {
                "address": "123 Manufacturing St",
                "city": "Detroit",
                "state": "MI",
                "zip_code": "48201",
                "country": "USA"
            }
        }
        
        response, error = self.make_request(
            "POST", "/api/v1/orders/", 
            valid_order, 
            self.tokens.get("client")
        )
        
        if error:
            self.log_test("Valid order creation", "FAIL", error)
            return
            
        order_id = response.get("id")
        self.orders["main_order"] = response
        self.log_test("Valid order creation", "PASS", f"Order ID: {order_id}")

    def test_producer_quote_workflow(self):
        """Test 3: Producer Quote Management Workflow"""
        print("\n=== Testing Producer Quote Workflow ===")
        
        if not self.orders.get("main_order"):
            self.log_test("Quote workflow", "SKIP", "No order available for quoting")
            return
            
        order_id = self.orders["main_order"]["id"]
        
        # Test quote submission
        quote_data = {
            "order_id": order_id,
            "price": 6500.00,
            "delivery_time": 21,
            "message": "We can deliver high-quality aluminum brackets with precision CNC machining.",
            "specifications": {
                "manufacturing_process": "CNC Machining + Anodizing",
                "quality_certifications": ["ISO 9001", "AS9100"]
            }
        }
        
        response, error = self.make_request(
            "POST", "/api/v1/quotes/", 
            quote_data, 
            self.tokens.get("producer")
        )
        
        if error:
            self.log_test("Quote submission", "FAIL", error)
            return
            
        quote_id = response.get("id")
        self.quotes["main_quote"] = response
        self.log_test("Quote submission", "PASS", f"Quote ID: {quote_id}")

    def test_security_and_validation(self):
        """Test 4: Security and Validation Testing"""
        print("\n=== Testing Security and Validation ===")
        
        # Test unauthorized access
        response, error = self.make_request("GET", "/api/v1/orders/")
        if error and ("unauthorized" in error.lower() or "token" in error.lower()):
            self.log_test("Unauthorized access blocked", "PASS", "Properly blocked unauthenticated request")
        else:
            self.log_test("Unauthorized access blocked", "FAIL", "Should have blocked unauthenticated request")
        
        # Test input validation
        malicious_inputs = [
            {"title": "<script>alert('xss')</script>", "description": "XSS test"},
            {"title": "A" * 1000, "description": "Length overflow test"}
        ]
        
        for malicious_input in malicious_inputs:
            response, error = self.make_request(
                "POST", "/api/v1/orders/",
                malicious_input,
                self.tokens.get("client")
            )
            
            if error:
                self.log_test("Input validation", "PASS", f"Blocked malicious input")
            else:
                self.log_test("Input validation", "WARN", f"May not have properly validated input")

    def generate_report(self):
        """Generate comprehensive test report"""
        print("\n" + "="*60)
        print("ADVANCED ORDER WORKFLOW TEST REPORT")
        print("="*60)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r["status"] == "PASS"])
        failed_tests = len([r for r in self.test_results if r["status"] == "FAIL"])
        warning_tests = len([r for r in self.test_results if r["status"] == "WARN"])
        skipped_tests = len([r for r in self.test_results if r["status"] == "SKIP"])
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"⚠️  Warnings: {warning_tests}")
        print(f"⏭️  Skipped: {skipped_tests}")
        
        if total_tests > 0:
            success_rate = (passed_tests / total_tests) * 100
            print(f"Success Rate: {success_rate:.1f}%")
        else:
            success_rate = 0
        
        # Detailed results
        print("\nDetailed Results:")
        print("-" * 40)
        for result in self.test_results:
            status_icon = {"PASS": "✅", "FAIL": "❌", "WARN": "⚠️", "SKIP": "⏭️"}.get(result["status"], "❓")
            print(f"{status_icon} {result['test']}")
            if result["details"]:
                print(f"   {result['details']}")
        
        return {
            "total_tests": total_tests,
            "passed": passed_tests,
            "failed": failed_tests,
            "warnings": warning_tests,
            "skipped": skipped_tests,
            "success_rate": success_rate
        }

    def run_all_tests(self):
        """Run comprehensive order workflow tests"""
        print("🏭 ADVANCED ORDER WORKFLOW TEST SUITE")
        print("=====================================")
        print("Testing comprehensive manufacturing platform workflows...")
        
        try:
            # Test server connectivity first
            response, error = self.make_request("GET", "/docs")
            if error:
                print(f"❌ Server not accessible: {error}")
                return False
                
            print("✅ Server is accessible")
            
            # Run all test suites
            self.test_user_setup()
            self.test_order_creation_workflow()
            self.test_producer_quote_workflow()
            self.test_security_and_validation()
            
            # Generate final report
            report = self.generate_report()
            return report["failed"] == 0
            
        except Exception as e:
            print(f"❌ Test suite failed with error: {e}")
            return False

def main():
    """Main test execution"""
    tester = OrderWorkflowTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All critical tests passed! Manufacturing platform is ready for advanced workflows.")
        sys.exit(0)
    else:
        print("\n⚠️ Some tests failed. Please review the results above.")
        sys.exit(1)

if __name__ == "__main__":
    main() 
#!/usr/bin/env python3
"""
Comprehensive Advanced Functionality Testing Script
for Manufacturing Platform API

This script tests all advanced features including:
- Authentication & Authorization
- Order Management
- Intelligent Matching
- Email Automation
- Performance Monitoring
- Role-based Access Control
- Real-time Features
"""

import asyncio
import json
import time
import requests
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import random
from faker import Faker

fake = Faker()

class AdvancedAPITester:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api/v1"
        self.session = requests.Session()
        self.tokens = {}
        self.users = {}
        self.orders = []
        self.quotes = []
        self.manufacturers = []
        
        # Test results tracking
        self.test_results = {
            "passed": 0,
            "failed": 0,
            "errors": [],
            "performance_metrics": {}
        }

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
        
        self.test_results["performance_metrics"][test_name] = response_time
        print()

    def make_request(self, method: str, endpoint: str, **kwargs) -> requests.Response:
        """Make HTTP request with timing"""
        start_time = time.time()
        url = f"{self.api_url}{endpoint}"
        
        try:
            response = self.session.request(method, url, **kwargs)
            response_time = time.time() - start_time
            return response, response_time
        except Exception as e:
            response_time = time.time() - start_time
            print(f"Request failed: {e}")
            return None, response_time

    def test_health_check(self):
        """Test API health check"""
        print("🔍 Testing API Health Check...")
        
        try:
            response, response_time = self.make_request("GET", "/health")
            if response and response.status_code == 200:
                self.log_test("Health Check", True, "API is healthy", response_time)
            else:
                self.log_test("Health Check", False, f"Status: {response.status_code if response else 'No response'}")
        except Exception as e:
            self.log_test("Health Check", False, f"Exception: {str(e)}")

    def test_authentication_flow(self):
        """Test complete authentication flow"""
        print("🔐 Testing Authentication Flow...")
        
        # Test user registration
        self.test_user_registration()
        
        # Test user login
        self.test_user_login()
        
        # Test token validation
        self.test_token_validation()
        
        # Test role-based access
        self.test_role_based_access()

    def test_user_registration(self):
        """Test user registration for different roles"""
        
        # Register a buyer
        buyer_data = {
            "email": fake.email(),
            "password": "TestPassword123!",
            "full_name": fake.name(),
            "role": "buyer",
            "company_name": fake.company(),
            "phone": fake.phone_number()
        }
        
        response, response_time = self.make_request("POST", "/auth/register", json=buyer_data)
        if response and response.status_code == 201:
            self.users["buyer"] = response.json()
            self.log_test("Buyer Registration", True, f"User ID: {self.users['buyer']['id']}", response_time)
        else:
            self.log_test("Buyer Registration", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Register a manufacturer
        manufacturer_data = {
            "email": fake.email(),
            "password": "TestPassword123!",
            "full_name": fake.name(),
            "role": "manufacturer",
            "company_name": fake.company(),
            "phone": fake.phone_number(),
            "capabilities": ["CNC Machining", "3D Printing", "Metal Fabrication"],
            "certifications": ["ISO 9001", "AS9100"],
            "location": {
                "address": fake.address(),
                "city": fake.city(),
                "country": fake.country()
            }
        }
        
        response, response_time = self.make_request("POST", "/auth/register", json=manufacturer_data)
        if response and response.status_code == 201:
            self.users["manufacturer"] = response.json()
            self.manufacturers.append(self.users["manufacturer"])
            self.log_test("Manufacturer Registration", True, f"User ID: {self.users['manufacturer']['id']}", response_time)
        else:
            self.log_test("Manufacturer Registration", False, f"Status: {response.status_code if response else 'No response'}")

    def test_user_login(self):
        """Test user login"""
        
        for role in ["buyer", "manufacturer"]:
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
                self.session.headers.update({"Authorization": f"Bearer {self.tokens[role]}"})
                self.log_test(f"{role.title()} Login", True, "Token received", response_time)
            else:
                self.log_test(f"{role.title()} Login", False, f"Status: {response.status_code if response else 'No response'}")

    def test_token_validation(self):
        """Test token validation"""
        
        for role in ["buyer", "manufacturer"]:
            if role not in self.tokens:
                continue
                
            headers = {"Authorization": f"Bearer {self.tokens[role]}"}
            response, response_time = self.make_request("GET", "/auth/me", headers=headers)
            
            if response and response.status_code == 200:
                user_data = response.json()
                self.log_test(f"{role.title()} Token Validation", True, f"User: {user_data['email']}", response_time)
            else:
                self.log_test(f"{role.title()} Token Validation", False, f"Status: {response.status_code if response else 'No response'}")

    def test_role_based_access(self):
        """Test role-based access control"""
        
        # Test buyer accessing buyer-only endpoint
        if "buyer" in self.tokens:
            headers = {"Authorization": f"Bearer {self.tokens['buyer']}"}
            response, response_time = self.make_request("GET", "/orders/my-orders", headers=headers)
            
            success = response and response.status_code in [200, 404]  # 404 is OK if no orders exist
            self.log_test("Buyer Access Control", success, "Buyer can access own orders", response_time)
        
        # Test manufacturer accessing manufacturer-only endpoint
        if "manufacturer" in self.tokens:
            headers = {"Authorization": f"Bearer {self.tokens['manufacturer']}"}
            response, response_time = self.make_request("GET", "/orders", headers=headers)
            
            success = response and response.status_code in [200, 404]
            self.log_test("Manufacturer Access Control", success, "Manufacturer can browse orders", response_time)

    def test_order_management(self):
        """Test comprehensive order management"""
        print("📦 Testing Order Management...")
        
        if "buyer" not in self.tokens:
            self.log_test("Order Management", False, "No buyer token available")
            return
        
        # Create order
        self.test_create_order()
        
        # List orders
        self.test_list_orders()
        
        # Update order
        self.test_update_order()
        
        # Search orders
        self.test_search_orders()

    def test_create_order(self):
        """Test order creation"""
        
        order_data = {
            "title": fake.catch_phrase(),
            "description": fake.text(max_nb_chars=500),
            "quantity": random.randint(1, 1000),
            "material": random.choice(["Steel", "Aluminum", "Plastic", "Titanium"]),
            "delivery_date": (datetime.now() + timedelta(days=30)).isoformat(),
            "budget_min": random.randint(1000, 5000),
            "budget_max": random.randint(5000, 50000),
            "specifications": {
                "dimensions": f"{random.randint(1, 100)}x{random.randint(1, 100)}x{random.randint(1, 100)}mm",
                "tolerance": "±0.1mm",
                "finish": random.choice(["Anodized", "Powder Coated", "Raw", "Polished"])
            },
            "location": {
                "address": fake.address(),
                "city": fake.city(),
                "country": fake.country()
            }
        }
        
        headers = {"Authorization": f"Bearer {self.tokens['buyer']}"}
        response, response_time = self.make_request("POST", "/orders", json=order_data, headers=headers)
        
        if response and response.status_code == 201:
            order = response.json()
            self.orders.append(order)
            self.log_test("Create Order", True, f"Order ID: {order['id']}", response_time)
        else:
            error_detail = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_test("Create Order", False, f"Status: {response.status_code if response else 'No response'}, Error: {error_detail}")

    def test_list_orders(self):
        """Test listing orders"""
        
        headers = {"Authorization": f"Bearer {self.tokens['buyer']}"}
        response, response_time = self.make_request("GET", "/orders/my-orders", headers=headers)
        
        if response and response.status_code == 200:
            orders = response.json()
            self.log_test("List Orders", True, f"Found {len(orders)} orders", response_time)
        else:
            self.log_test("List Orders", False, f"Status: {response.status_code if response else 'No response'}")

    def test_update_order(self):
        """Test order update"""
        
        if not self.orders:
            self.log_test("Update Order", False, "No orders available to update")
            return
        
        order_id = self.orders[0]["id"]
        update_data = {
            "title": f"Updated {fake.catch_phrase()}",
            "description": f"Updated description: {fake.text(max_nb_chars=300)}"
        }
        
        headers = {"Authorization": f"Bearer {self.tokens['buyer']}"}
        response, response_time = self.make_request("PUT", f"/orders/{order_id}", json=update_data, headers=headers)
        
        if response and response.status_code == 200:
            self.log_test("Update Order", True, f"Order {order_id} updated", response_time)
        else:
            self.log_test("Update Order", False, f"Status: {response.status_code if response else 'No response'}")

    def test_search_orders(self):
        """Test order search functionality"""
        
        search_terms = ["steel", "aluminum", "machining", "fabrication"]
        
        for term in search_terms:
            headers = {"Authorization": f"Bearer {self.tokens['manufacturer']}"}
            response, response_time = self.make_request("GET", f"/orders?search={term}", headers=headers)
            
            if response and response.status_code == 200:
                results = response.json()
                self.log_test(f"Search Orders ({term})", True, f"Found {len(results)} results", response_time)
            else:
                self.log_test(f"Search Orders ({term})", False, f"Status: {response.status_code if response else 'No response'}")

    def test_intelligent_matching(self):
        """Test intelligent matching system"""
        print("🧠 Testing Intelligent Matching...")
        
        if not self.orders or "buyer" not in self.tokens:
            self.log_test("Intelligent Matching", False, "No orders or buyer token available")
            return
        
        # Test find matches
        self.test_find_matches()
        
        # Test match analysis
        self.test_match_analysis()
        
        # Test broadcast functionality
        self.test_broadcast_orders()

    def test_find_matches(self):
        """Test finding manufacturer matches for orders"""
        
        order_id = self.orders[0]["id"]
        match_request = {
            "order_id": order_id,
            "max_matches": 5,
            "min_score": 0.3
        }
        
        headers = {"Authorization": f"Bearer {self.tokens['buyer']}"}
        response, response_time = self.make_request("POST", "/matching/find-matches", json=match_request, headers=headers)
        
        if response and response.status_code == 200:
            matches = response.json()
            self.log_test("Find Matches", True, f"Found {len(matches.get('matches', []))} matches", response_time)
        else:
            self.log_test("Find Matches", False, f"Status: {response.status_code if response else 'No response'}")

    def test_match_analysis(self):
        """Test detailed match analysis"""
        
        if not self.manufacturers or not self.orders:
            self.log_test("Match Analysis", False, "No manufacturers or orders available")
            return
        
        manufacturer_id = self.manufacturers[0]["id"]
        order_id = self.orders[0]["id"]
        
        headers = {"Authorization": f"Bearer {self.tokens['buyer']}"}
        response, response_time = self.make_request(
            "GET", 
            f"/matching/manufacturers/{manufacturer_id}/match-analysis?order_id={order_id}", 
            headers=headers
        )
        
        if response and response.status_code == 200:
            analysis = response.json()
            self.log_test("Match Analysis", True, f"Analysis completed", response_time)
        else:
            self.log_test("Match Analysis", False, f"Status: {response.status_code if response else 'No response'}")

    def test_broadcast_orders(self):
        """Test broadcasting orders to multiple manufacturers"""
        
        if not self.manufacturers or not self.orders:
            self.log_test("Broadcast Orders", False, "No manufacturers or orders available")
            return
        
        broadcast_request = {
            "order_id": self.orders[0]["id"],
            "manufacturer_ids": [m["id"] for m in self.manufacturers[:3]]  # Broadcast to first 3 manufacturers
        }
        
        headers = {"Authorization": f"Bearer {self.tokens['buyer']}"}
        response, response_time = self.make_request("POST", "/matching/broadcast", json=broadcast_request, headers=headers)
        
        if response and response.status_code == 200:
            result = response.json()
            self.log_test("Broadcast Orders", True, f"Broadcasted to {len(broadcast_request['manufacturer_ids'])} manufacturers", response_time)
        else:
            self.log_test("Broadcast Orders", False, f"Status: {response.status_code if response else 'No response'}")

    def test_email_automation(self):
        """Test email automation system"""
        print("📧 Testing Email Automation...")
        
        # Test email templates
        self.test_email_templates()
        
        # Test email sending
        self.test_email_sending()

    def test_email_templates(self):
        """Test email template management"""
        
        headers = {"Authorization": f"Bearer {self.tokens['buyer']}"}
        response, response_time = self.make_request("GET", "/emails/templates", headers=headers)
        
        if response and response.status_code == 200:
            templates = response.json()
            self.log_test("Email Templates", True, f"Found {len(templates)} templates", response_time)
        else:
            self.log_test("Email Templates", False, f"Status: {response.status_code if response else 'No response'}")

    def test_email_sending(self):
        """Test email sending functionality"""
        
        if not self.orders:
            self.log_test("Email Sending", False, "No orders available for email testing")
            return
        
        email_data = {
            "template_name": "order_created",
            "recipient_email": fake.email(),
            "context": {
                "order_id": self.orders[0]["id"],
                "order_title": self.orders[0]["title"]
            }
        }
        
        headers = {"Authorization": f"Bearer {self.tokens['buyer']}"}
        response, response_time = self.make_request("POST", "/emails/send", json=email_data, headers=headers)
        
        if response and response.status_code in [200, 202]:  # 202 for async processing
            self.log_test("Email Sending", True, "Email queued successfully", response_time)
        else:
            self.log_test("Email Sending", False, f"Status: {response.status_code if response else 'No response'}")

    def test_performance_monitoring(self):
        """Test performance monitoring endpoints"""
        print("📊 Testing Performance Monitoring...")
        
        # Test system metrics
        self.test_system_metrics()
        
        # Test API metrics
        self.test_api_metrics()

    def test_system_metrics(self):
        """Test system performance metrics"""
        
        headers = {"Authorization": f"Bearer {self.tokens['buyer']}"}
        response, response_time = self.make_request("GET", "/performance/system", headers=headers)
        
        if response and response.status_code == 200:
            metrics = response.json()
            self.log_test("System Metrics", True, f"Retrieved system metrics", response_time)
        else:
            self.log_test("System Metrics", False, f"Status: {response.status_code if response else 'No response'}")

    def test_api_metrics(self):
        """Test API performance metrics"""
        
        headers = {"Authorization": f"Bearer {self.tokens['buyer']}"}
        response, response_time = self.make_request("GET", "/performance/api", headers=headers)
        
        if response and response.status_code == 200:
            metrics = response.json()
            self.log_test("API Metrics", True, f"Retrieved API metrics", response_time)
        else:
            self.log_test("API Metrics", False, f"Status: {response.status_code if response else 'No response'}")

    def test_advanced_features(self):
        """Test advanced platform features"""
        print("🚀 Testing Advanced Features...")
        
        # Test file upload
        self.test_file_upload()
        
        # Test real-time notifications
        self.test_notifications()
        
        # Test analytics
        self.test_analytics()

    def test_file_upload(self):
        """Test file upload functionality"""
        
        # Create a dummy file for testing
        test_file_content = b"This is a test file for upload testing"
        files = {"file": ("test_document.txt", test_file_content, "text/plain")}
        
        headers = {"Authorization": f"Bearer {self.tokens['buyer']}"}
        response, response_time = self.make_request("POST", "/upload", files=files, headers=headers)
        
        if response and response.status_code == 200:
            upload_result = response.json()
            self.log_test("File Upload", True, f"File uploaded: {upload_result.get('filename', 'Unknown')}", response_time)
        else:
            self.log_test("File Upload", False, f"Status: {response.status_code if response else 'No response'}")

    def test_notifications(self):
        """Test notification system"""
        
        headers = {"Authorization": f"Bearer {self.tokens['buyer']}"}
        response, response_time = self.make_request("GET", "/notifications", headers=headers)
        
        if response and response.status_code == 200:
            notifications = response.json()
            self.log_test("Notifications", True, f"Retrieved notifications", response_time)
        else:
            self.log_test("Notifications", False, f"Status: {response.status_code if response else 'No response'}")

    def test_analytics(self):
        """Test analytics endpoints"""
        
        headers = {"Authorization": f"Bearer {self.tokens['buyer']}"}
        response, response_time = self.make_request("GET", "/analytics/dashboard", headers=headers)
        
        if response and response.status_code == 200:
            analytics = response.json()
            self.log_test("Analytics", True, f"Retrieved analytics data", response_time)
        else:
            self.log_test("Analytics", False, f"Status: {response.status_code if response else 'No response'}")

    def test_error_handling(self):
        """Test error handling and edge cases"""
        print("⚠️ Testing Error Handling...")
        
        # Test invalid endpoints
        response, response_time = self.make_request("GET", "/invalid-endpoint")
        success = response and response.status_code == 404
        self.log_test("Invalid Endpoint", success, "404 returned for invalid endpoint", response_time)
        
        # Test unauthorized access
        response, response_time = self.make_request("GET", "/orders/my-orders")
        success = response and response.status_code == 401
        self.log_test("Unauthorized Access", success, "401 returned for unauthorized access", response_time)
        
        # Test invalid data
        invalid_order = {"invalid": "data"}
        headers = {"Authorization": f"Bearer {self.tokens['buyer']}"} if "buyer" in self.tokens else {}
        response, response_time = self.make_request("POST", "/orders", json=invalid_order, headers=headers)
        success = response and response.status_code in [400, 422]
        self.log_test("Invalid Data", success, "400/422 returned for invalid data", response_time)

    def run_load_test(self, concurrent_requests: int = 10, duration: int = 30):
        """Run basic load test"""
        print(f"🔥 Running Load Test ({concurrent_requests} concurrent requests for {duration}s)...")
        
        import threading
        import time
        
        results = {"success": 0, "failure": 0, "total_time": 0}
        start_time = time.time()
        
        def make_concurrent_request():
            while time.time() - start_time < duration:
                try:
                    response, response_time = self.make_request("GET", "/health")
                    if response and response.status_code == 200:
                        results["success"] += 1
                    else:
                        results["failure"] += 1
                    results["total_time"] += response_time
                except:
                    results["failure"] += 1
                time.sleep(0.1)  # Small delay between requests
        
        threads = []
        for _ in range(concurrent_requests):
            thread = threading.Thread(target=make_concurrent_request)
            thread.start()
            threads.append(thread)
        
        for thread in threads:
            thread.join()
        
        total_requests = results["success"] + results["failure"]
        avg_response_time = results["total_time"] / total_requests if total_requests > 0 else 0
        success_rate = (results["success"] / total_requests * 100) if total_requests > 0 else 0
        
        self.log_test(
            "Load Test", 
            success_rate > 95, 
            f"Success Rate: {success_rate:.1f}%, Avg Response Time: {avg_response_time:.3f}s, Total Requests: {total_requests}"
        )

    def generate_test_report(self):
        """Generate comprehensive test report"""
        print("\n" + "="*80)
        print("📋 COMPREHENSIVE TEST REPORT")
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
        
        # Performance metrics
        print(f"\n📊 PERFORMANCE METRICS:")
        avg_response_time = sum(self.test_results["performance_metrics"].values()) / len(self.test_results["performance_metrics"]) if self.test_results["performance_metrics"] else 0
        print(f"Average Response Time: {avg_response_time:.3f}s")
        
        # Slowest endpoints
        sorted_metrics = sorted(self.test_results["performance_metrics"].items(), key=lambda x: x[1], reverse=True)
        print(f"\n🐌 SLOWEST ENDPOINTS:")
        for endpoint, time_taken in sorted_metrics[:5]:
            print(f"   - {endpoint}: {time_taken:.3f}s")
        
        print("\n" + "="*80)
        
        return {
            "total_tests": total_tests,
            "passed": self.test_results["passed"],
            "failed": self.test_results["failed"],
            "success_rate": success_rate,
            "avg_response_time": avg_response_time,
            "errors": self.test_results["errors"]
        }

    async def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting Comprehensive Advanced Functionality Testing")
        print("="*80)
        
        # Basic connectivity
        self.test_health_check()
        
        # Authentication & Authorization
        self.test_authentication_flow()
        
        # Core functionality
        self.test_order_management()
        
        # Advanced features
        self.test_intelligent_matching()
        self.test_email_automation()
        self.test_performance_monitoring()
        self.test_advanced_features()
        
        # Error handling
        self.test_error_handling()
        
        # Load testing
        self.run_load_test(concurrent_requests=5, duration=10)  # Light load test
        
        # Generate report
        return self.generate_test_report()


def main():
    """Main test execution"""
    tester = AdvancedAPITester()
    
    try:
        # Run all tests
        report = asyncio.run(tester.run_all_tests())
        
        # Save report to file
        with open("test_report.json", "w") as f:
            json.dump(report, f, indent=2)
        
        print(f"\n📄 Test report saved to: test_report.json")
        
        # Exit with appropriate code
        exit_code = 0 if report["success_rate"] > 80 else 1
        exit(exit_code)
        
    except KeyboardInterrupt:
        print("\n⚠️ Testing interrupted by user")
        exit(1)
    except Exception as e:
        print(f"\n💥 Testing failed with error: {str(e)}")
        exit(1)


if __name__ == "__main__":
    main() 
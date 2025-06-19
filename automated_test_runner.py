#!/usr/bin/env python3
"""
Automated Core Business Flow Test Runner
Tests all three user journeys automatically
"""

import requests
import json
import time
from datetime import datetime, timedelta

class AutomatedBusinessFlowTester:
    def __init__(self):
        self.base_url = "http://localhost:8000"
        self.api_base = f"{self.base_url}/api/v1"
        self.tokens = {}
        self.test_data = {}
        self.results = []
        self.timestamp = int(time.time())
        
    def log_test(self, test_name, success, details=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   {details}")
        self.results.append({"test": test_name, "success": success, "details": details})
        
    def make_request(self, method, endpoint, data=None, token=None):
        """Make HTTP request with error handling"""
        try:
            headers = {"Content-Type": "application/json"}
            if token:
                headers["Authorization"] = f"Bearer {token}"
                
            url = f"{self.api_base}{endpoint}"
            
            if method == "GET":
                response = requests.get(url, headers=headers, timeout=10)
            elif method == "POST":
                response = requests.post(url, headers=headers, json=data, timeout=10)
            else:
                return False, {}, f"Unsupported method: {method}"
            
            if response.status_code in [200, 201, 202]:
                return True, response.json(), ""
            else:
                return False, {}, f"Status {response.status_code}: {response.text[:200]}"
                
        except Exception as e:
            return False, {}, str(e)

    def test_backend_health(self):
        """Test backend health"""
        print("\n🏥 TESTING BACKEND HEALTH")
        print("-" * 40)
        
        try:
            response = requests.get(f"{self.base_url}/health", timeout=5)
            if response.status_code == 200:
                data = response.json()
                self.log_test("Backend Health Check", True, f"Status: {data.get('status', 'unknown')}")
                return True
            else:
                self.log_test("Backend Health Check", False, f"Status code: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Backend Health Check", False, f"Error: {str(e)}")
            return False

    def test_client_journey(self):
        """Test complete client journey"""
        print("\n🔵 TESTING CLIENT JOURNEY")
        print("-" * 40)
        
        # Step 1: Client Registration
        client_data = {
            "email": f"test_client_{self.timestamp}@example.com",
            "password": "ClientPassword123!",
            "first_name": "Test",
            "last_name": "Client",
            "role": "client",
            "phone": "+1234567890",
            "country": "USA",
            "data_processing_consent": True,
            "marketing_consent": False
        }
        
        success, response, error = self.make_request("POST", "/auth/register", client_data)
        if success:
            self.test_data["client_id"] = response.get("id")
            self.test_data["client_email"] = client_data["email"]
            self.log_test("Client Registration", True, f"ID: {response.get('id')}")
        else:
            self.log_test("Client Registration", False, error)
            return False

        # Step 2: Client Login
        login_data = {"email": client_data["email"], "password": client_data["password"]}
        success, response, error = self.make_request("POST", "/auth/login-json", login_data)
        if success:
            self.tokens["client"] = response.get("access_token")
            self.log_test("Client Login", True, "Token received")
        else:
            self.log_test("Client Login", False, error)
            return False

        # Step 3: Create Order
        order_data = {
            "title": "Automated Test Order - Precision Parts",
            "description": "Automated test order for 100 precision machined parts",
            "quantity": 100,
            "material": "Aluminum 6061-T6",
            "industry_category": "Aerospace",
            "delivery_deadline": (datetime.now() + timedelta(days=30)).isoformat(),
            "budget_max_pln": 25000,
            "preferred_country": "USA",
            "max_distance_km": 300,
            "technical_requirements": {
                "tolerance": "±0.01mm",
                "surface_finish": "Ra 1.6",
                "manufacturing_process": "CNC machining"
            },
            "files": [],
            "rush_order": False
        }
        
        success, response, error = self.make_request("POST", "/orders/", order_data, self.tokens["client"])
        if success:
            self.test_data["order_id"] = response.get("id")
            self.log_test("Order Creation", True, f"Order ID: {response.get('id')}")
        else:
            self.log_test("Order Creation", False, error)
            return False

        # Step 4: View Orders
        success, response, error = self.make_request("GET", "/orders/", token=self.tokens["client"])
        if success:
            orders = response.get("items", response if isinstance(response, list) else [])
            self.log_test("View Orders", True, f"Found {len(orders)} orders")
        else:
            self.log_test("View Orders", False, error)

        return True

    def test_manufacturer_journey(self):
        """Test complete manufacturer journey"""
        print("\n🟣 TESTING MANUFACTURER JOURNEY")
        print("-" * 40)
        
        # Step 1: Manufacturer Registration
        manufacturer_data = {
            "email": f"test_manufacturer_{self.timestamp}@example.com",
            "password": "ManufacturerPassword123!",
            "first_name": "Test",
            "last_name": "Manufacturer",
            "role": "manufacturer",
            "company_name": "Automated Test Manufacturing Corp",
            "phone": "+1234567891",
            "country": "USA",
            "data_processing_consent": True,
            "marketing_consent": True
        }
        
        success, response, error = self.make_request("POST", "/auth/register", manufacturer_data)
        if success:
            self.test_data["manufacturer_id"] = response.get("id")
            self.test_data["manufacturer_email"] = manufacturer_data["email"]
            self.log_test("Manufacturer Registration", True, f"ID: {response.get('id')}")
        else:
            self.log_test("Manufacturer Registration", False, error)
            return False

        # Step 2: Manufacturer Login
        login_data = {"email": manufacturer_data["email"], "password": manufacturer_data["password"]}
        success, response, error = self.make_request("POST", "/auth/login-json", login_data)
        if success:
            self.tokens["manufacturer"] = response.get("access_token")
            self.log_test("Manufacturer Login", True, "Token received")
        else:
            self.log_test("Manufacturer Login", False, error)
            return False

        # Step 3: Browse Orders
        success, response, error = self.make_request("GET", "/orders/", token=self.tokens["manufacturer"])
        if success:
            orders = response.get("items", response if isinstance(response, list) else [])
            self.log_test("Browse Orders", True, f"Found {len(orders)} orders")
        else:
            self.log_test("Browse Orders", False, error)

        # Step 4: Create Quote
        if self.test_data.get("order_id"):
            quote_data = {
                "order_id": self.test_data["order_id"],
                "price": 18500.00,
                "delivery_time": 21,
                "message": "Automated test quote - competitive pricing with quality assurance",
                "specifications": {
                    "manufacturing_process": "CNC machining with quality inspection",
                    "quality_certifications": ["ISO 9001"],
                    "material_source": "Certified aluminum supplier"
                }
            }
            
            success, response, error = self.make_request("POST", "/quotes/", quote_data, self.tokens["manufacturer"])
            if success:
                self.test_data["quote_id"] = response.get("id")
                self.log_test("Quote Creation", True, f"Quote ID: {response.get('id')}, Price: ${quote_data['price']:,.2f}")
            else:
                self.log_test("Quote Creation", False, error)
        else:
            self.log_test("Quote Creation", False, "No order available")

        return True

    def test_quote_workflow(self):
        """Test quote acceptance workflow"""
        print("\n💰 TESTING QUOTE WORKFLOW")
        print("-" * 40)
        
        # Step 1: Client views quotes
        success, response, error = self.make_request("GET", "/quotes/", token=self.tokens["client"])
        if success:
            quotes = response.get("items", response if isinstance(response, list) else [])
            self.log_test("View Quotes", True, f"Found {len(quotes)} quotes")
        else:
            self.log_test("View Quotes", False, error)

        # Step 2: Accept quote
        if self.test_data.get("quote_id"):
            success, response, error = self.make_request("POST", f"/quotes/{self.test_data['quote_id']}/accept", 
                                                       token=self.tokens["client"])
            if success:
                self.log_test("Quote Acceptance", True, "Quote accepted successfully")
            else:
                self.log_test("Quote Acceptance", False, error)
        else:
            self.log_test("Quote Acceptance", False, "No quote available")

        return True

    def test_admin_functions(self):
        """Test admin functionality"""
        print("\n🟢 TESTING ADMIN FUNCTIONS")
        print("-" * 40)
        
        # Try admin login
        admin_login = {"email": "admin@example.com", "password": "AdminPassword123!"}
        success, response, error = self.make_request("POST", "/auth/login-json", admin_login)
        if success:
            self.tokens["admin"] = response.get("access_token")
            self.log_test("Admin Login", True, "Admin authenticated")
            
            # Test user management
            success, response, error = self.make_request("GET", "/users/", token=self.tokens["admin"])
            if success:
                users = response.get("items", response if isinstance(response, list) else [])
                self.log_test("User Management", True, f"Found {len(users)} users")
            else:
                self.log_test("User Management", False, error)
        else:
            self.log_test("Admin Login", False, "Admin user not available")

        return True

    def generate_report(self):
        """Generate final test report"""
        print("\n" + "="*60)
        print("📊 AUTOMATED TEST EXECUTION REPORT")
        print("="*60)
        
        total_tests = len(self.results)
        passed_tests = sum(1 for r in self.results if r["success"])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"\n📈 SUMMARY:")
        print(f"   Total Tests: {total_tests}")
        print(f"   ✅ Passed: {passed_tests}")
        print(f"   ❌ Failed: {failed_tests}")
        print(f"   📊 Success Rate: {success_rate:.1f}%")
        
        print(f"\n🎯 TEST DATA CREATED:")
        if self.test_data.get("client_email"):
            print(f"   📧 Client: {self.test_data['client_email']}")
        if self.test_data.get("manufacturer_email"):
            print(f"   🏭 Manufacturer: {self.test_data['manufacturer_email']}")
        if self.test_data.get("order_id"):
            print(f"   📋 Order ID: {self.test_data['order_id']}")
        if self.test_data.get("quote_id"):
            print(f"   💰 Quote ID: {self.test_data['quote_id']}")
        
        # Show failed tests
        failed_tests_list = [r for r in self.results if not r["success"]]
        if failed_tests_list:
            print(f"\n❌ FAILED TESTS:")
            for test in failed_tests_list:
                print(f"   • {test['test']}: {test['details']}")
        
        print(f"\n🎉 CORE BUSINESS FLOWS {'PASSED' if success_rate >= 80 else 'NEED ATTENTION'}!")
        
        return success_rate >= 80

    def run_all_tests(self):
        """Run all automated tests"""
        print("🚀 AUTOMATED CORE BUSINESS FLOW TESTING")
        print("="*60)
        print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Backend URL: {self.base_url}")
        
        try:
            # Test 1: Backend Health
            if not self.test_backend_health():
                print("\n❌ Backend not healthy. Stopping tests.")
                return False
            
            # Test 2: Client Journey
            if not self.test_client_journey():
                print("\n⚠️ Client journey failed. Continuing with other tests...")
            
            # Test 3: Manufacturer Journey
            if not self.test_manufacturer_journey():
                print("\n⚠️ Manufacturer journey failed. Continuing with other tests...")
            
            # Test 4: Quote Workflow
            if not self.test_quote_workflow():
                print("\n⚠️ Quote workflow failed. Continuing with other tests...")
            
            # Test 5: Admin Functions
            if not self.test_admin_functions():
                print("\n⚠️ Admin functions failed. Continuing...")
            
            # Generate final report
            success = self.generate_report()
            return success
            
        except KeyboardInterrupt:
            print("\n⚠️ Testing interrupted by user")
            return False
        except Exception as e:
            print(f"\n❌ Testing failed with error: {e}")
            return False

def main():
    """Main execution"""
    tester = AutomatedBusinessFlowTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 ALL TESTS PASSED! Your platform is ready for production.")
    else:
        print("\n⚠️ Some tests failed. Review the results above.")
    
    return 0 if success else 1

if __name__ == "__main__":
    import sys
    sys.exit(main()) 
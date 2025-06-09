"""
Corrected comprehensive test script for Manufacturing Platform
Tests all pages and functionality with proper API structure
"""

import requests
import json
import time
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
FRONTEND_URL = "http://localhost:3000"

# Test data with corrected field names
TEST_CLIENT = {
    "email": f"test_client_{int(time.time())}@example.com",
    "password": "TestPassword123!",
    "first_name": "Test",
    "last_name": "Client",
    "role": "client",
    "phone": "+1234567890",
    "country": "USA",
    "data_processing_consent": True
}

TEST_MANUFACTURER = {
    "email": f"test_manufacturer_{int(time.time())}@example.com",
    "password": "TestPassword123!",
    "first_name": "Test",
    "last_name": "Manufacturer",
    "role": "manufacturer",
    "business_name": "Test Manufacturing Co.",
    "phone": "+1234567891",
    "country": "USA",
    "data_processing_consent": True,
    "categories": ["electronics", "mechanical"],
    "capabilities": ["3D Printing", "CNC Machining"],
    "certifications": ["ISO 9001"]
}

class TestResult:
    def __init__(self, name: str):
        self.name = name
        self.passed = False
        self.error = None
        self.details = {}
    
    def __str__(self):
        status = "✅ PASSED" if self.passed else "❌ FAILED"
        result = f"{status} - {self.name}"
        if self.error:
            result += f"\n   Error: {self.error}"
        if self.details:
            result += f"\n   Details: {json.dumps(self.details, indent=2)}"
        return result

class ManufacturingPlatformTester:
    def __init__(self):
        self.session = requests.Session()
        self.client_token = None
        self.manufacturer_token = None
        self.client_id = None
        self.manufacturer_id = None
        self.order_id = None
        self.quote_id = None
        self.results = []
    
    def add_result(self, result: TestResult):
        self.results.append(result)
        print(result)
        print("-" * 80)
    
    def test_health_check(self):
        """Test 1: Health Check Endpoints"""
        result = TestResult("Health Check Endpoints")
        try:
            # Test backend health
            response = requests.get(f"{BASE_URL.replace('/api/v1', '')}/health")
            assert response.status_code == 200, f"Backend health check failed: {response.status_code}"
            result.details["backend"] = response.json()
            
            # Test frontend
            response = requests.get(FRONTEND_URL)
            assert response.status_code == 200, f"Frontend not accessible: {response.status_code}"
            
            result.passed = True
        except Exception as e:
            result.error = str(e)
        
        self.add_result(result)
    
    def test_registration(self):
        """Test 2: User Registration"""
        # Test Client Registration
        result = TestResult("Client Registration")
        try:
            response = self.session.post(f"{BASE_URL}/auth/register", json=TEST_CLIENT)
            if response.status_code == 201:
                data = response.json()
                self.client_id = data.get("id")
                result.details = {"user_id": self.client_id, "email": TEST_CLIENT["email"]}
                result.passed = True
            else:
                result.error = f"Status {response.status_code}: {response.text}"
        except Exception as e:
            result.error = str(e)
        self.add_result(result)
        
        # Test Manufacturer Registration
        result = TestResult("Manufacturer Registration")
        try:
            response = self.session.post(f"{BASE_URL}/auth/register", json=TEST_MANUFACTURER)
            if response.status_code == 201:
                data = response.json()
                self.manufacturer_id = data.get("id")
                result.details = {"user_id": self.manufacturer_id, "email": TEST_MANUFACTURER["email"]}
                result.passed = True
            else:
                result.error = f"Status {response.status_code}: {response.text}"
        except Exception as e:
            result.error = str(e)
        self.add_result(result)
    
    def test_login(self):
        """Test 3: User Login"""
        # Test Client Login
        result = TestResult("Client Login")
        try:
            # OAuth2 compatible login
            login_data = {
                "username": TEST_CLIENT["email"],
                "password": TEST_CLIENT["password"],
                "grant_type": "password"
            }
            response = self.session.post(
                f"{BASE_URL}/auth/login",
                data=login_data,  # Use form data for OAuth2
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            if response.status_code == 200:
                data = response.json()
                self.client_token = data.get("access_token")
                result.details = {"token_type": data.get("token_type")}
                result.passed = True
            else:
                result.error = f"Status {response.status_code}: {response.text}"
        except Exception as e:
            result.error = str(e)
        self.add_result(result)
        
        # Test Manufacturer Login
        result = TestResult("Manufacturer Login")
        try:
            login_data = {
                "username": TEST_MANUFACTURER["email"],
                "password": TEST_MANUFACTURER["password"],
                "grant_type": "password"
            }
            response = self.session.post(
                f"{BASE_URL}/auth/login",
                data=login_data,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            if response.status_code == 200:
                data = response.json()
                self.manufacturer_token = data.get("access_token")
                result.details = {"token_type": data.get("token_type")}
                result.passed = True
            else:
                result.error = f"Status {response.status_code}: {response.text}"
        except Exception as e:
            result.error = str(e)
        self.add_result(result)
    
    def test_user_profile(self):
        """Test 4: User Profile Access"""
        result = TestResult("User Profile Access")
        try:
            headers = {"Authorization": f"Bearer {self.client_token}"}
            response = self.session.get(f"{BASE_URL}/users/me", headers=headers)
            if response.status_code == 200:
                data = response.json()
                result.details = {
                    "email": data.get("email"),
                    "role": data.get("role"),
                    "is_active": data.get("is_active")
                }
                result.passed = True
            else:
                result.error = f"Status {response.status_code}: {response.text}"
        except Exception as e:
            result.error = str(e)
        self.add_result(result)
    
    def test_create_order(self):
        """Test 5: Create Order"""
        result = TestResult("Create Order")
        try:
            headers = {"Authorization": f"Bearer {self.client_token}"}
            order_data = {
                "title": "Test Manufacturing Order",
                "description": "This is a test order for manufacturing platform testing",
                "category": "electronics",
                "quantity": 100,
                "unit": "pieces",
                "budget_min": 4000.00,
                "budget_max": 6000.00,
                "currency": "USD",
                "delivery_date": (datetime.now() + timedelta(days=30)).isoformat(),
                "specifications": {
                    "material": "Aluminum",
                    "dimensions": "10x10x5 cm",
                    "color": "Silver"
                },
                "requirements": ["Quality certification required", "Eco-friendly materials preferred"]
            }
            response = self.session.post(f"{BASE_URL}/orders", json=order_data, headers=headers)
            if response.status_code == 201:
                data = response.json()
                self.order_id = data.get("id")
                result.details = {
                    "order_id": self.order_id,
                    "status": data.get("status"),
                    "title": data.get("title")
                }
                result.passed = True
            else:
                result.error = f"Status {response.status_code}: {response.text}"
        except Exception as e:
            result.error = str(e)
        self.add_result(result)
    
    def test_list_orders(self):
        """Test 6: List Orders"""
        result = TestResult("List Orders")
        try:
            headers = {"Authorization": f"Bearer {self.client_token}"}
            response = self.session.get(f"{BASE_URL}/orders", headers=headers)
            if response.status_code == 200:
                data = response.json()
                result.details = {
                    "total": data.get("total", 0),
                    "items_count": len(data.get("items", []))
                }
                result.passed = True
            else:
                result.error = f"Status {response.status_code}: {response.text}"
        except Exception as e:
            result.error = str(e)
        self.add_result(result)
    
    def test_order_details(self):
        """Test 7: Get Order Details"""
        result = TestResult("Get Order Details")
        try:
            if not self.order_id:
                result.error = "No order ID available from previous test"
            else:
                headers = {"Authorization": f"Bearer {self.client_token}"}
                response = self.session.get(f"{BASE_URL}/orders/{self.order_id}", headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    result.details = {
                        "order_id": data.get("id"),
                        "status": data.get("status"),
                        "quotes_count": len(data.get("quotes", []))
                    }
                    result.passed = True
                else:
                    result.error = f"Status {response.status_code}: {response.text}"
        except Exception as e:
            result.error = str(e)
        self.add_result(result)
    
    def test_manufacturer_dashboard(self):
        """Test 8: Manufacturer Dashboard"""
        result = TestResult("Manufacturer Dashboard")
        try:
            headers = {"Authorization": f"Bearer {self.manufacturer_token}"}
            response = self.session.get(f"{BASE_URL}/dashboard/manufacturer", headers=headers)
            if response.status_code == 200:
                data = response.json()
                result.details = {
                    "total_quotes": data.get("total_quotes", 0),
                    "active_orders": data.get("active_orders", 0)
                }
                result.passed = True
            else:
                result.error = f"Status {response.status_code}: {response.text}"
        except Exception as e:
            result.error = str(e)
        self.add_result(result)
    
    def test_create_quote(self):
        """Test 9: Create Quote"""
        result = TestResult("Create Quote")
        try:
            if not self.order_id:
                result.error = "No order ID available"
            else:
                headers = {"Authorization": f"Bearer {self.manufacturer_token}"}
                quote_data = {
                    "order_id": self.order_id,
                    "price": 4500.00,
                    "currency": "USD",
                    "delivery_days": 14,
                    "valid_until": (datetime.now() + timedelta(days=7)).isoformat(),
                    "description": "We can deliver this order within 2 weeks",
                    "includes_shipping": True,
                    "payment_terms": "50% upfront, 50% on delivery"
                }
                response = self.session.post(f"{BASE_URL}/quotes", json=quote_data, headers=headers)
                if response.status_code == 201:
                    data = response.json()
                    self.quote_id = data.get("id")
                    result.details = {
                        "quote_id": self.quote_id,
                        "price": data.get("price"),
                        "status": data.get("status")
                    }
                    result.passed = True
                else:
                    result.error = f"Status {response.status_code}: {response.text}"
        except Exception as e:
            result.error = str(e)
        self.add_result(result)
    
    def test_frontend_pages(self):
        """Test 10: Frontend Page Accessibility"""
        pages = [
            ("/", "Homepage"),
            ("/login", "Login Page"),
            ("/register", "Register Page"),
            ("/about", "About Page"),
            ("/contact", "Contact Page"),
            ("/privacy", "Privacy Page"),
            ("/terms", "Terms Page")
        ]
        
        all_passed = True
        for path, name in pages:
            result = TestResult(f"Frontend - {name}")
            try:
                response = requests.get(f"{FRONTEND_URL}{path}")
                if response.status_code == 200:
                    result.passed = True
                else:
                    result.error = f"Status {response.status_code}"
                    all_passed = False
            except Exception as e:
                result.error = str(e)
                all_passed = False
            self.add_result(result)
    
    def test_api_documentation(self):
        """Test 11: API Documentation"""
        result = TestResult("API Documentation")
        try:
            response = requests.get(f"{BASE_URL.replace('/api/v1', '')}/docs")
            if response.status_code == 200:
                result.passed = True
                result.details = {"swagger_ui": "accessible"}
            else:
                result.error = f"Status {response.status_code}"
        except Exception as e:
            result.error = str(e)
        self.add_result(result)
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("=" * 80)
        print("MANUFACTURING PLATFORM - COMPREHENSIVE TESTING")
        print("=" * 80)
        print(f"Backend URL: {BASE_URL}")
        print(f"Frontend URL: {FRONTEND_URL}")
        print(f"Test Started: {datetime.now()}")
        print("=" * 80)
        
        # Run tests in order
        self.test_health_check()
        self.test_registration()
        self.test_login()
        self.test_user_profile()
        self.test_create_order()
        self.test_list_orders()
        self.test_order_details()
        self.test_manufacturer_dashboard()
        self.test_create_quote()
        self.test_frontend_pages()
        self.test_api_documentation()
        
        # Summary
        print("=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        passed = sum(1 for r in self.results if r.passed)
        failed = len(self.results) - passed
        print(f"Total Tests: {len(self.results)}")
        print(f"Passed: {passed} ✅")
        print(f"Failed: {failed} ❌")
        print(f"Success Rate: {(passed/len(self.results)*100):.1f}%")
        print("=" * 80)
        
        # Failed tests details
        if failed > 0:
            print("\nFAILED TESTS:")
            for r in self.results:
                if not r.passed:
                    print(f"- {r.name}: {r.error}")
        
        # Recommendations
        print("\nRECOMMENDATIONS:")
        print("1. Ensure all API endpoints are properly implemented")
        print("2. Check authentication middleware configuration")
        print("3. Verify database migrations are up to date")
        print("4. Test with proper Stripe API keys for payment functionality")
        
        return passed, failed

if __name__ == "__main__":
    tester = ManufacturingPlatformTester()
    passed, failed = tester.run_all_tests()
    
    # Exit with appropriate code
    exit(0 if failed == 0 else 1) 
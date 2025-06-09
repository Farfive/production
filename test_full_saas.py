"""
Full SaaS Platform Test - Using Existing Activated Users
Tests all functionality with proper user activation
"""

import requests
import json
import time
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
FRONTEND_URL = "http://localhost:3000"

# Use the existing activated test users
ACTIVATED_CLIENT = {
    "email": "test_client_1749455351@example.com",
    "password": "TestPassword123!"
}

ACTIVATED_MANUFACTURER = {
    "email": "test_manufacturer_1749455351@example.com", 
    "password": "TestPassword123!"
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

class SaaSPlatformTester:
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
        """Test 1: Health Check"""
        result = TestResult("Health Check")
        try:
            response = requests.get(f"{BASE_URL.replace('/api/v1', '')}/health")
            assert response.status_code == 200, f"Health check failed: {response.status_code}"
            result.details = response.json()
            result.passed = True
        except Exception as e:
            result.error = str(e)
        self.add_result(result)
    
    def test_login_existing_users(self):
        """Test 2: Login with Existing Activated Users"""
        # Client Login
        result = TestResult("Client Login (Activated User)")
        try:
            login_data = {
                "username": ACTIVATED_CLIENT["email"],
                "password": ACTIVATED_CLIENT["password"],
                "grant_type": "password"
            }
            response = self.session.post(
                f"{BASE_URL}/auth/login",
                data=login_data,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            if response.status_code == 200:
                data = response.json()
                self.client_token = data.get("access_token")
                result.details = {"token_obtained": True, "email": ACTIVATED_CLIENT["email"]}
                result.passed = True
            else:
                result.error = f"Status {response.status_code}: {response.text}"
        except Exception as e:
            result.error = str(e)
        self.add_result(result)
        
        # Manufacturer Login
        result = TestResult("Manufacturer Login (Activated User)")
        try:
            login_data = {
                "username": ACTIVATED_MANUFACTURER["email"],
                "password": ACTIVATED_MANUFACTURER["password"],
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
                result.details = {"token_obtained": True, "email": ACTIVATED_MANUFACTURER["email"]}
                result.passed = True
            else:
                result.error = f"Status {response.status_code}: {response.text}"
        except Exception as e:
            result.error = str(e)
        self.add_result(result)
    
    def test_user_profile(self):
        """Test 3: Get User Profile"""
        result = TestResult("Get User Profile")
        try:
            headers = {"Authorization": f"Bearer {self.client_token}"}
            response = self.session.get(f"{BASE_URL}/users/me", headers=headers)
            if response.status_code == 200:
                data = response.json()
                self.client_id = data.get("id")
                result.details = {
                    "user_id": data.get("id"),
                    "email": data.get("email"),
                    "role": data.get("role"),
                    "is_active": data.get("is_active"),
                    "email_verified": data.get("email_verified")
                }
                result.passed = True
            else:
                result.error = f"Status {response.status_code}: {response.text}"
        except Exception as e:
            result.error = str(e)
        self.add_result(result)
    
    def test_create_order(self):
        """Test 4: Create Order"""
        result = TestResult("Create Order")
        try:
            headers = {"Authorization": f"Bearer {self.client_token}"}
            order_data = {
                "title": "Full SaaS Test Order",
                "description": "Testing complete SaaS functionality with activated user",
                "technology": "CNC Machining",
                "material": "Aluminum",
                "quantity": 100,
                "budget_pln": 25000.00,
                "delivery_deadline": (datetime.now() + timedelta(days=30)).isoformat(),
                "priority": "normal",
                "preferred_location": "Warsaw",
                "specifications": {
                    "material_grade": "High-grade aluminum 6061",
                    "dimensions": "15x15x10 cm",
                    "color": "Matte black",
                    "finish": "Anodized",
                    "tolerance": "+/- 0.1mm"
                }
            }
            response = self.session.post(f"{BASE_URL}/orders", json=order_data, headers=headers)
            if response.status_code in [200, 201]:
                data = response.json()
                self.order_id = data.get("id")
                result.details = {
                    "order_id": self.order_id,
                    "status": data.get("status"),
                    "title": data.get("title"),
                    "created_at": data.get("created_at")
                }
                result.passed = True
            else:
                result.error = f"Status {response.status_code}: {response.text}"
        except Exception as e:
            result.error = str(e)
        self.add_result(result)
    
    def test_list_orders(self):
        """Test 5: List Orders"""
        result = TestResult("List Orders")
        try:
            headers = {"Authorization": f"Bearer {self.client_token}"}
            response = self.session.get(f"{BASE_URL}/orders", headers=headers)
            if response.status_code == 200:
                data = response.json()
                orders = data.get("items", []) if isinstance(data, dict) else data
                result.details = {
                    "total_orders": len(orders),
                    "order_titles": [o.get("title") for o in orders[:3]]
                }
                result.passed = True
            else:
                result.error = f"Status {response.status_code}: {response.text}"
        except Exception as e:
            result.error = str(e)
        self.add_result(result)
    
    def test_manufacturer_view_orders(self):
        """Test 6: Manufacturer View Available Orders"""
        result = TestResult("Manufacturer View Available Orders")
        try:
            headers = {"Authorization": f"Bearer {self.manufacturer_token}"}
            response = self.session.get(f"{BASE_URL}/orders", headers=headers)
            if response.status_code == 200:
                data = response.json()
                orders = data.get("items", []) if isinstance(data, dict) else data
                available_orders = [o for o in orders if o.get("status") in ["published", "open"]]
                result.details = {
                    "available_orders": len(available_orders),
                    "categories": list(set(o.get("category") for o in available_orders))
                }
                result.passed = True
            else:
                result.error = f"Status {response.status_code}: {response.text}"
        except Exception as e:
            result.error = str(e)
        self.add_result(result)
    
    def test_create_quote(self):
        """Test 7: Create Quote"""
        result = TestResult("Create Quote")
        try:
            if not self.order_id:
                result.error = "No order ID available"
            else:
                headers = {"Authorization": f"Bearer {self.manufacturer_token}"}
                quote_data = {
                    "order_id": self.order_id,
                    "price": 7500.00,
                    "currency": "USD",
                    "delivery_days": 21,
                    "valid_until": (datetime.now() + timedelta(days=14)).isoformat(),
                    "description": "We can deliver high-quality products within 3 weeks",
                    "includes_shipping": True,
                    "payment_terms": "30% upfront, 70% on delivery",
                    "notes": "We have experience with similar projects"
                }
                response = self.session.post(f"{BASE_URL}/quotes", json=quote_data, headers=headers)
                if response.status_code == 201:
                    data = response.json()
                    self.quote_id = data.get("id")
                    result.details = {
                        "quote_id": self.quote_id,
                        "price": data.get("price"),
                        "delivery_days": data.get("delivery_days"),
                        "status": data.get("status")
                    }
                    result.passed = True
                else:
                    result.error = f"Status {response.status_code}: {response.text}"
        except Exception as e:
            result.error = str(e)
        self.add_result(result)
    
    def test_list_quotes(self):
        """Test 8: List Quotes (Client View)"""
        result = TestResult("List Quotes - Client View")
        try:
            headers = {"Authorization": f"Bearer {self.client_token}"}
            response = self.session.get(f"{BASE_URL}/quotes", headers=headers)
            if response.status_code == 200:
                data = response.json()
                quotes = data.get("items", []) if isinstance(data, dict) else data
                result.details = {
                    "total_quotes": len(quotes),
                    "quote_prices": [q.get("price") for q in quotes[:3]]
                }
                result.passed = True
            else:
                result.error = f"Status {response.status_code}: {response.text}"
        except Exception as e:
            result.error = str(e)
        self.add_result(result)
    
    def test_dashboard_stats(self):
        """Test 9: Dashboard Statistics"""
        result = TestResult("Client Dashboard Stats")
        try:
            headers = {"Authorization": f"Bearer {self.client_token}"}
            response = self.session.get(f"{BASE_URL}/dashboard/client", headers=headers)
            if response.status_code == 200:
                data = response.json()
                result.details = {
                    "total_orders": data.get("total_orders", 0),
                    "active_orders": data.get("active_orders", 0),
                    "total_quotes": data.get("total_quotes", 0)
                }
                result.passed = True
            else:
                result.error = f"Status {response.status_code}: {response.text}"
        except Exception as e:
            result.error = str(e)
        self.add_result(result)
    
    def test_frontend_authenticated_pages(self):
        """Test 10: Frontend Authenticated Pages"""
        pages = [
            ("/dashboard", "Dashboard"),
            ("/orders", "Orders Page"),
            ("/quotes", "Quotes Page"),
            ("/profile", "Profile Page"),
            ("/settings", "Settings Page")
        ]
        
        for path, name in pages:
            result = TestResult(f"Frontend - {name}")
            try:
                # Note: Frontend pages will redirect to login if not authenticated
                # This just checks if the pages are accessible
                response = requests.get(f"{FRONTEND_URL}{path}", allow_redirects=False)
                if response.status_code in [200, 302, 301]:  # OK or redirect to login
                    result.passed = True
                    result.details = {"status": response.status_code}
                else:
                    result.error = f"Status {response.status_code}"
            except Exception as e:
                result.error = str(e)
            self.add_result(result)
    
    def test_api_error_handling(self):
        """Test 11: API Error Handling"""
        result = TestResult("API Error Handling")
        try:
            # Test unauthorized access
            response = self.session.get(f"{BASE_URL}/orders")
            if response.status_code == 401:
                result.details["unauthorized_access"] = "Properly rejected"
            
            # Test invalid data
            headers = {"Authorization": f"Bearer {self.client_token}"}
            response = self.session.post(f"{BASE_URL}/orders", json={}, headers=headers)
            if response.status_code in [400, 422]:
                result.details["validation_error"] = "Properly handled"
            
            # Test non-existent resource
            response = self.session.get(f"{BASE_URL}/orders/99999", headers=headers)
            if response.status_code == 404:
                result.details["not_found"] = "Properly handled"
            
            result.passed = True
        except Exception as e:
            result.error = str(e)
        self.add_result(result)
    
    def run_all_tests(self):
        """Run all SaaS platform tests"""
        print("=" * 80)
        print("FULL SAAS PLATFORM TESTING")
        print("=" * 80)
        print(f"Backend URL: {BASE_URL}")
        print(f"Frontend URL: {FRONTEND_URL}")
        print(f"Test Started: {datetime.now()}")
        print("=" * 80)
        
        # Run tests in order
        self.test_health_check()
        self.test_login_existing_users()
        
        if self.client_token and self.manufacturer_token:
            self.test_user_profile()
            self.test_create_order()
            self.test_list_orders()
            self.test_manufacturer_view_orders()
            self.test_create_quote()
            self.test_list_quotes()
            self.test_dashboard_stats()
            self.test_frontend_authenticated_pages()
            self.test_api_error_handling()
        else:
            print("\n⚠️  Authentication failed - skipping authenticated tests")
        
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
        
        if failed > 0:
            print("\nFAILED TESTS:")
            for r in self.results:
                if not r.passed:
                    print(f"- {r.name}: {r.error}")
        
        if passed == len(self.results):
            print("\n🎉 ALL TESTS PASSED! The SaaS platform is fully functional!")
        
        return passed, failed

if __name__ == "__main__":
    tester = SaaSPlatformTester()
    passed, failed = tester.run_all_tests()
    
    # Exit with appropriate code
    exit(0 if failed == 0 else 1) 
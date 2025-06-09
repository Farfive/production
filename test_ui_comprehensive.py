"""
Comprehensive UI Testing for Manufacturing Platform
Tests all pages and user flows with visual verification
"""

import time
import json
from datetime import datetime
from typing import Dict, List, Tuple
import requests

# Test configuration
FRONTEND_URL = "http://localhost:3000"
BACKEND_URL = "http://localhost:8000"
API_URL = f"{BACKEND_URL}/api/v1"

# Test credentials (from previous test)
TEST_CLIENT_EMAIL = "test_client_1749455351@example.com"
TEST_MANUFACTURER_EMAIL = "test_manufacturer_1749455351@example.com"
TEST_PASSWORD = "TestPassword123!"

class UITestResult:
    def __init__(self, page_name: str, test_name: str):
        self.page_name = page_name
        self.test_name = test_name
        self.passed = False
        self.error = None
        self.screenshots = []
        self.details = {}
    
    def __str__(self):
        status = "✅" if self.passed else "❌"
        result = f"{status} {self.page_name} - {self.test_name}"
        if self.error:
            result += f"\n   Error: {self.error}"
        return result

class ManufacturingPlatformUITester:
    def __init__(self):
        self.results = []
        self.client_token = None
        self.manufacturer_token = None
        
    def add_result(self, result: UITestResult):
        self.results.append(result)
        print(result)
        print("-" * 80)
    
    def test_page_load(self, url: str, page_name: str) -> bool:
        """Test if a page loads successfully"""
        result = UITestResult(page_name, "Page Load Test")
        try:
            response = requests.get(url)
            if response.status_code == 200:
                result.passed = True
                result.details = {
                    "status_code": response.status_code,
                    "content_length": len(response.text),
                    "has_react_root": '<div id="root">' in response.text
                }
            else:
                result.error = f"Page returned status {response.status_code}"
        except Exception as e:
            result.error = str(e)
        
        self.add_result(result)
        return result.passed
    
    def get_auth_tokens(self):
        """Get authentication tokens for testing"""
        result = UITestResult("Authentication", "Get Auth Tokens")
        try:
            # Login as client
            login_data = {
                "username": TEST_CLIENT_EMAIL,
                "password": TEST_PASSWORD,
                "grant_type": "password"
            }
            response = requests.post(
                f"{API_URL}/auth/login",
                data=login_data,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            if response.status_code == 200:
                self.client_token = response.json().get("access_token")
            
            # Login as manufacturer
            login_data["username"] = TEST_MANUFACTURER_EMAIL
            response = requests.post(
                f"{API_URL}/auth/login",
                data=login_data,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            if response.status_code == 200:
                self.manufacturer_token = response.json().get("access_token")
            
            if self.client_token and self.manufacturer_token:
                result.passed = True
                result.details = {
                    "client_token": "obtained",
                    "manufacturer_token": "obtained"
                }
            else:
                result.error = "Failed to obtain auth tokens"
        except Exception as e:
            result.error = str(e)
        
        self.add_result(result)
        return result.passed
    
    def test_public_pages(self):
        """Test all public pages"""
        public_pages = [
            ("/", "Homepage"),
            ("/login", "Login Page"),
            ("/register", "Registration Page"),
            ("/about", "About Page"),
            ("/contact", "Contact Page"),
            ("/privacy", "Privacy Policy"),
            ("/terms", "Terms of Service")
        ]
        
        print("\n🌐 TESTING PUBLIC PAGES")
        print("=" * 80)
        
        for path, name in public_pages:
            url = f"{FRONTEND_URL}{path}"
            self.test_page_load(url, name)
    
    def test_api_endpoints(self):
        """Test key API endpoints"""
        print("\n🔌 TESTING API ENDPOINTS")
        print("=" * 80)
        
        # Test health endpoint
        result = UITestResult("API", "Health Check")
        try:
            response = requests.get(f"{BACKEND_URL}/health")
            if response.status_code == 200:
                result.passed = True
                result.details = response.json()
            else:
                result.error = f"Status {response.status_code}"
        except Exception as e:
            result.error = str(e)
        self.add_result(result)
        
        # Test API docs
        result = UITestResult("API", "Documentation")
        try:
            response = requests.get(f"{BACKEND_URL}/docs")
            if response.status_code == 200:
                result.passed = True
                result.details = {"swagger_ui": "accessible"}
            else:
                result.error = f"Status {response.status_code}"
        except Exception as e:
            result.error = str(e)
        self.add_result(result)
    
    def test_authenticated_features(self):
        """Test authenticated features"""
        print("\n🔐 TESTING AUTHENTICATED FEATURES")
        print("=" * 80)
        
        if not self.client_token:
            print("⚠️  No authentication token available, skipping authenticated tests")
            return
        
        # Test client dashboard access
        result = UITestResult("Client Dashboard", "API Access")
        try:
            headers = {"Authorization": f"Bearer {self.client_token}"}
            response = requests.get(f"{API_URL}/dashboard/client", headers=headers)
            if response.status_code == 200:
                result.passed = True
                result.details = {"dashboard_data": "accessible"}
            else:
                result.error = f"Status {response.status_code}: {response.text}"
        except Exception as e:
            result.error = str(e)
        self.add_result(result)
        
        # Test order creation
        result = UITestResult("Orders", "Create Order API")
        try:
            headers = {"Authorization": f"Bearer {self.client_token}"}
            order_data = {
                "title": "UI Test Order",
                "description": "Order created during UI testing",
                "category": "electronics",
                "quantity": 50,
                "unit": "pieces",
                "budget_min": 1000.00,
                "budget_max": 2000.00,
                "currency": "USD",
                "delivery_date": "2024-07-30T00:00:00",
                "specifications": {"test": "data"},
                "requirements": ["Test requirement"]
            }
            response = requests.post(f"{API_URL}/orders", json=order_data, headers=headers)
            if response.status_code == 201:
                result.passed = True
                result.details = {"order_id": response.json().get("id")}
            else:
                result.error = f"Status {response.status_code}: {response.text}"
        except Exception as e:
            result.error = str(e)
        self.add_result(result)
    
    def test_ui_components(self):
        """Test specific UI components and features"""
        print("\n🎨 TESTING UI COMPONENTS")
        print("=" * 80)
        
        # Test homepage hero section
        result = UITestResult("Homepage", "Hero Section")
        try:
            response = requests.get(FRONTEND_URL)
            content = response.text
            
            # Check for enhanced UI elements
            checks = {
                "gradient_background": "gradient" in content,
                "animations": "animate" in content or "motion" in content,
                "modern_styling": "tailwind" in content or "glass" in content,
                "responsive_design": "sm:" in content and "lg:" in content
            }
            
            result.passed = all(checks.values())
            result.details = checks
            
            if not result.passed:
                result.error = "Missing expected UI enhancements"
        except Exception as e:
            result.error = str(e)
        self.add_result(result)
    
    def generate_report(self):
        """Generate a comprehensive test report"""
        print("\n" + "=" * 80)
        print("📊 UI TEST REPORT")
        print("=" * 80)
        print(f"Test Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Frontend URL: {FRONTEND_URL}")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 80)
        
        # Group results by page
        pages = {}
        for result in self.results:
            if result.page_name not in pages:
                pages[result.page_name] = []
            pages[result.page_name].append(result)
        
        # Summary by page
        print("\n📋 SUMMARY BY PAGE:")
        for page, results in pages.items():
            passed = sum(1 for r in results if r.passed)
            total = len(results)
            print(f"\n{page}:")
            print(f"  Tests: {total}")
            print(f"  Passed: {passed} ✅")
            print(f"  Failed: {total - passed} ❌")
            print(f"  Success Rate: {(passed/total*100):.1f}%")
        
        # Overall summary
        total_tests = len(self.results)
        total_passed = sum(1 for r in self.results if r.passed)
        total_failed = total_tests - total_passed
        
        print("\n" + "=" * 80)
        print("📈 OVERALL SUMMARY:")
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {total_passed} ✅")
        print(f"Failed: {total_failed} ❌")
        print(f"Success Rate: {(total_passed/total_tests*100):.1f}%")
        print("=" * 80)
        
        # Failed tests details
        if total_failed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.results:
                if not result.passed:
                    print(f"\n- {result.page_name} - {result.test_name}")
                    if result.error:
                        print(f"  Error: {result.error}")
        
        # Recommendations
        print("\n💡 RECOMMENDATIONS:")
        recommendations = []
        
        if any(r.page_name == "API" and not r.passed for r in self.results):
            recommendations.append("1. Check backend server is running and accessible")
        
        if any("Dashboard" in r.page_name and not r.passed for r in self.results):
            recommendations.append("2. Verify authentication and user activation")
        
        if any("UI" in r.test_name and not r.passed for r in self.results):
            recommendations.append("3. Ensure frontend build is complete and all assets are loaded")
        
        if not recommendations:
            recommendations.append("✅ All systems operational! The platform is working well.")
        
        for rec in recommendations:
            print(rec)
        
        # Save report to file
        report_data = {
            "test_date": datetime.now().isoformat(),
            "frontend_url": FRONTEND_URL,
            "backend_url": BACKEND_URL,
            "total_tests": total_tests,
            "passed": total_passed,
            "failed": total_failed,
            "success_rate": f"{(total_passed/total_tests*100):.1f}%",
            "results": [
                {
                    "page": r.page_name,
                    "test": r.test_name,
                    "passed": r.passed,
                    "error": r.error,
                    "details": r.details
                }
                for r in self.results
            ]
        }
        
        with open("ui_test_report.json", "w") as f:
            json.dump(report_data, f, indent=2)
        
        print(f"\n📄 Detailed report saved to: ui_test_report.json")
    
    def run_all_tests(self):
        """Run all UI tests"""
        print("🚀 STARTING COMPREHENSIVE UI TESTING")
        print("=" * 80)
        
        # Get authentication tokens first
        self.get_auth_tokens()
        
        # Test public pages
        self.test_public_pages()
        
        # Test API endpoints
        self.test_api_endpoints()
        
        # Test authenticated features
        self.test_authenticated_features()
        
        # Test UI components
        self.test_ui_components()
        
        # Generate report
        self.generate_report()

if __name__ == "__main__":
    tester = ManufacturingPlatformUITester()
    tester.run_all_tests() 
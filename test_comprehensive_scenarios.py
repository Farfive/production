#!/usr/bin/env python3
"""
🔬 COMPREHENSIVE TESTING SCENARIOS - MANUFACTURING PLATFORM
==========================================================

Complete test suite covering all functionality with proper API schema:
- User registration and authentication
- Order management workflows
- Security and validation testing
- Performance and stress testing
- Error handling and edge cases
"""

import json
import time
import requests
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
import random
import string

# Configuration
BASE_URL = "http://localhost:8000"
TEST_RESULTS = []

def log_test(test_name, status, details="", duration=0):
    """Log test results with timestamp"""
    result = {
        "test": test_name,
        "status": status,
        "details": details,
        "duration": f"{duration:.3f}s",
        "timestamp": datetime.now().isoformat()
    }
    TEST_RESULTS.append(result)
    status_emoji = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
    print(f"{status_emoji} {test_name}: {status} ({duration:.3f}s)")
    if details:
        print(f"   Details: {details}")

def generate_random_string(length=8):
    """Generate random string for testing"""
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

def generate_test_email():
    """Generate unique test email"""
    return f"test_{generate_random_string(8)}@example.com"

def wait_for_rate_limit():
    """Wait to avoid rate limiting"""
    time.sleep(2)

class ComprehensiveTestSuite:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.test_users = []
        self.test_tokens = []
        
    def run_all_tests(self):
        """Execute all comprehensive test scenarios"""
        print("🚀 STARTING COMPREHENSIVE TEST SCENARIOS")
        print("=" * 60)
        
        # Test categories in order
        test_categories = [
            ("🏥 Health & Connectivity", self.test_connectivity),
            ("🔐 Authentication & Security", self.test_authentication),
            ("👥 User Management", self.test_user_management),
            ("📦 Order Management", self.test_order_management),
            ("🎯 Business Logic", self.test_business_logic),
            ("⚡ Performance Testing", self.test_performance),
            ("🛡️ Security Testing", self.test_security),
            ("🔄 Edge Cases", self.test_edge_cases),
            ("📊 Data Validation", self.test_data_validation),
            ("🌐 API Compliance", self.test_api_compliance)
        ]
        
        for category_name, test_function in test_categories:
            print(f"\n{category_name}")
            print("-" * 40)
            try:
                test_function()
                wait_for_rate_limit()  # Prevent rate limiting between categories
            except Exception as e:
                log_test(f"{category_name} - CRITICAL ERROR", "FAIL", str(e))
        
        self.generate_comprehensive_report()

    def test_connectivity(self):
        """Test basic connectivity and health"""
        
        # Health Check
        start_time = time.time()
        try:
            response = requests.get(f"{self.base_url}/health", timeout=10)
            if response.status_code == 200:
                health_data = response.json()
                log_test("Health Check", "PASS", 
                        f"Status: {health_data.get('status', 'unknown')}", 
                        time.time() - start_time)
            else:
                log_test("Health Check", "FAIL", 
                        f"Status code: {response.status_code}", 
                        time.time() - start_time)
        except Exception as e:
            log_test("Health Check", "FAIL", str(e), time.time() - start_time)

        # API Documentation
        start_time = time.time()
        try:
            response = requests.get(f"{self.base_url}/docs", timeout=10)
            if response.status_code == 200:
                log_test("API Documentation", "PASS", 
                        "Swagger docs accessible", 
                        time.time() - start_time)
            else:
                log_test("API Documentation", "FAIL", 
                        f"Status code: {response.status_code}", 
                        time.time() - start_time)
        except Exception as e:
            log_test("API Documentation", "FAIL", str(e), time.time() - start_time)

        # OpenAPI Schema
        start_time = time.time()
        try:
            response = requests.get(f"{self.base_url}/openapi.json", timeout=10)
            if response.status_code == 200:
                schema = response.json()
                log_test("OpenAPI Schema", "PASS", 
                        f"Version: {schema.get('info', {}).get('version', 'unknown')}", 
                        time.time() - start_time)
            else:
                log_test("OpenAPI Schema", "FAIL", 
                        f"Status code: {response.status_code}", 
                        time.time() - start_time)
        except Exception as e:
            log_test("OpenAPI Schema", "FAIL", str(e), time.time() - start_time)

    def test_authentication(self):
        """Test authentication workflows"""
        
        # User Registration - Client
        start_time = time.time()
        try:
            wait_for_rate_limit()
            client_email = generate_test_email()
            client_data = {
                "email": client_email,
                "password": "SecurePass123!",
                "first_name": "Test",
                "last_name": "Client",
                "company_name": "Test Client Company",
                "role": "client",
                "data_processing_consent": True,
                "marketing_consent": False
            }
            
            response = requests.post(f"{self.base_url}/api/v1/auth/register", json=client_data)
            if response.status_code == 201:
                user_data = response.json()
                self.test_users.append({
                    "email": client_email,
                    "password": "SecurePass123!",
                    "role": "client",
                    "user_data": user_data
                })
                log_test("Client Registration", "PASS", 
                        f"User ID: {user_data.get('user', {}).get('id', 'unknown')}", 
                        time.time() - start_time)
            else:
                error_detail = response.json().get('detail', 'Unknown error') if response.content else f"Status: {response.status_code}"
                log_test("Client Registration", "FAIL", error_detail, time.time() - start_time)
        except Exception as e:
            log_test("Client Registration", "FAIL", str(e), time.time() - start_time)

        # User Registration - Manufacturer
        start_time = time.time()
        try:
            wait_for_rate_limit()
            manufacturer_email = generate_test_email()
            manufacturer_data = {
                "email": manufacturer_email,
                "password": "SecurePass123!",
                "first_name": "Test",
                "last_name": "Manufacturer",
                "company_name": "Test Manufacturing Co",
                "role": "manufacturer",
                "data_processing_consent": True,
                "marketing_consent": True
            }
            
            response = requests.post(f"{self.base_url}/api/v1/auth/register", json=manufacturer_data)
            if response.status_code == 201:
                user_data = response.json()
                self.test_users.append({
                    "email": manufacturer_email,
                    "password": "SecurePass123!",
                    "role": "manufacturer",
                    "user_data": user_data
                })
                log_test("Manufacturer Registration", "PASS", 
                        f"User ID: {user_data.get('user', {}).get('id', 'unknown')}", 
                        time.time() - start_time)
            else:
                error_detail = response.json().get('detail', 'Unknown error') if response.content else f"Status: {response.status_code}"
                log_test("Manufacturer Registration", "FAIL", error_detail, time.time() - start_time)
        except Exception as e:
            log_test("Manufacturer Registration", "FAIL", str(e), time.time() - start_time)

        # User Login
        if self.test_users:
            start_time = time.time()
            try:
                wait_for_rate_limit()
                test_user = self.test_users[0]
                login_data = {
                    "email": test_user["email"],
                    "password": test_user["password"]
                }
                
                response = requests.post(f"{self.base_url}/api/v1/auth/login", json=login_data)
                if response.status_code == 200:
                    token_data = response.json()
                    self.test_tokens.append({
                        "token": token_data["access_token"],
                        "user": test_user,
                        "expires_in": token_data.get("expires_in", 3600)
                    })
                    log_test("User Login", "PASS", 
                            f"Token expires in: {token_data.get('expires_in', 'unknown')}s", 
                            time.time() - start_time)
                else:
                    error_detail = response.json().get('detail', 'Unknown error') if response.content else f"Status: {response.status_code}"
                    log_test("User Login", "FAIL", error_detail, time.time() - start_time)
            except Exception as e:
                log_test("User Login", "FAIL", str(e), time.time() - start_time)

        # Protected Endpoint Access
        if self.test_tokens:
            start_time = time.time()
            try:
                wait_for_rate_limit()
                token_info = self.test_tokens[0]
                headers = {"Authorization": f"Bearer {token_info['token']}"}
                
                response = requests.get(f"{self.base_url}/api/v1/auth/me", headers=headers)
                if response.status_code == 200:
                    profile_data = response.json()
                    log_test("Protected Endpoint Access", "PASS", 
                            f"User: {profile_data.get('first_name', 'unknown')} {profile_data.get('last_name', '')}", 
                            time.time() - start_time)
                else:
                    error_detail = response.json().get('detail', 'Unknown error') if response.content else f"Status: {response.status_code}"
                    log_test("Protected Endpoint Access", "FAIL", error_detail, time.time() - start_time)
            except Exception as e:
                log_test("Protected Endpoint Access", "FAIL", str(e), time.time() - start_time)

    def test_user_management(self):
        """Test user management functionality"""
        
        if not self.test_tokens:
            log_test("User Management", "SKIP", "No authenticated users available")
            return

        # Profile Update
        start_time = time.time()
        try:
            wait_for_rate_limit()
            token_info = self.test_tokens[0]
            headers = {"Authorization": f"Bearer {token_info['token']}"}
            
            update_data = {
                "company_name": "Updated Company Name",
                "phone": "+48123456789",
                "marketing_consent": True
            }
            
            response = requests.put(f"{self.base_url}/api/v1/auth/profile", json=update_data, headers=headers)
            if response.status_code == 200:
                updated_profile = response.json()
                log_test("Profile Update", "PASS", 
                        f"Company: {updated_profile.get('company_name', 'unknown')}", 
                        time.time() - start_time)
            else:
                error_detail = response.json().get('detail', 'Unknown error') if response.content else f"Status: {response.status_code}"
                log_test("Profile Update", "FAIL", error_detail, time.time() - start_time)
        except Exception as e:
            log_test("Profile Update", "FAIL", str(e), time.time() - start_time)

    def test_order_management(self):
        """Test order management functionality"""
        
        if not self.test_tokens:
            log_test("Order Management", "SKIP", "No authenticated users available")
            return

        # Order Creation
        start_time = time.time()
        try:
            wait_for_rate_limit()
            token_info = self.test_tokens[0]
            headers = {"Authorization": f"Bearer {token_info['token']}"}
            
            order_data = {
                "title": "Test Manufacturing Order",
                "description": "This is a comprehensive test order for manufacturing platform validation",
                "category": "electronics",
                "quantity": 100,
                "budget": 15000.00,
                "deadline": (datetime.now() + timedelta(days=30)).isoformat(),
                "requirements": {
                    "materials": ["aluminum", "steel", "plastic"],
                    "quality_standards": ["ISO9001", "CE"],
                    "delivery_location": "Warsaw, Poland"
                },
                "attachments": ["specification.pdf", "drawing.dwg"]
            }
            
            response = requests.post(f"{self.base_url}/api/v1/orders/", json=order_data, headers=headers)
            if response.status_code == 201:
                order_response = response.json()
                log_test("Order Creation", "PASS", 
                        f"Order ID: {order_response.get('id', 'unknown')}", 
                        time.time() - start_time)
            else:
                error_detail = response.json().get('detail', 'Unknown error') if response.content else f"Status: {response.status_code}"
                log_test("Order Creation", "FAIL", error_detail, time.time() - start_time)
        except Exception as e:
            log_test("Order Creation", "FAIL", str(e), time.time() - start_time)

        # Order Listing
        start_time = time.time()
        try:
            wait_for_rate_limit()
            token_info = self.test_tokens[0]
            headers = {"Authorization": f"Bearer {token_info['token']}"}
            
            response = requests.get(f"{self.base_url}/api/v1/orders/", headers=headers)
            if response.status_code == 200:
                orders_data = response.json()
                order_count = len(orders_data) if isinstance(orders_data, list) else orders_data.get('total', 0)
                log_test("Order Listing", "PASS", 
                        f"Found {order_count} orders", 
                        time.time() - start_time)
            else:
                error_detail = response.json().get('detail', 'Unknown error') if response.content else f"Status: {response.status_code}"
                log_test("Order Listing", "FAIL", error_detail, time.time() - start_time)
        except Exception as e:
            log_test("Order Listing", "FAIL", str(e), time.time() - start_time)

    def test_business_logic(self):
        """Test business logic and workflows"""
        
        # Duplicate Email Registration
        start_time = time.time()
        try:
            wait_for_rate_limit()
            if self.test_users:
                existing_email = self.test_users[0]["email"]
                duplicate_data = {
                    "email": existing_email,
                    "password": "DifferentPass123!",
                    "first_name": "Duplicate",
                    "last_name": "User",
                    "company_name": "Duplicate Company",
                    "role": "manufacturer",
                    "data_processing_consent": True
                }
                
                response = requests.post(f"{self.base_url}/api/v1/auth/register", json=duplicate_data)
                if response.status_code in [400, 409, 422]:
                    log_test("Duplicate Email Prevention", "PASS", 
                            f"Duplicate registration rejected: {response.status_code}", 
                            time.time() - start_time)
                else:
                    log_test("Duplicate Email Prevention", "FAIL", 
                            f"Duplicate registration allowed: {response.status_code}", 
                            time.time() - start_time)
            else:
                log_test("Duplicate Email Prevention", "SKIP", "No existing users to test with")
        except Exception as e:
            log_test("Duplicate Email Prevention", "FAIL", str(e), time.time() - start_time)

    def test_performance(self):
        """Test performance characteristics"""
        
        # Response Time Test
        start_time = time.time()
        try:
            response_times = []
            for i in range(5):
                req_start = time.time()
                response = requests.get(f"{self.base_url}/health")
                req_duration = time.time() - req_start
                response_times.append(req_duration)
                
                if response.status_code != 200:
                    log_test("Response Time Test", "FAIL", f"Health check failed on attempt {i+1}")
                    return
                
                time.sleep(0.5)  # Small delay between requests
            
            avg_response_time = sum(response_times) / len(response_times)
            max_response_time = max(response_times)
            
            if avg_response_time < 0.2 and max_response_time < 1.0:
                log_test("Response Time Test", "PASS", 
                        f"Avg: {avg_response_time:.3f}s, Max: {max_response_time:.3f}s", 
                        time.time() - start_time)
            else:
                log_test("Response Time Test", "WARN", 
                        f"Slow response - Avg: {avg_response_time:.3f}s, Max: {max_response_time:.3f}s", 
                        time.time() - start_time)
        except Exception as e:
            log_test("Response Time Test", "FAIL", str(e), time.time() - start_time)

    def test_security(self):
        """Test security features"""
        
        # Invalid Token Test
        start_time = time.time()
        try:
            invalid_tokens = [
                "invalid.token.here",
                "Bearer malicious_token",
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature",
                ""
            ]
            
            for token in invalid_tokens:
                wait_for_rate_limit()
                headers = {"Authorization": f"Bearer {token}"}
                response = requests.get(f"{self.base_url}/api/v1/auth/me", headers=headers)
                if response.status_code not in [401, 422]:
                    log_test("Invalid Token Security", "FAIL", f"Invalid token accepted: {token}")
                    return
            
            log_test("Invalid Token Security", "PASS", "All invalid tokens rejected", time.time() - start_time)
        except Exception as e:
            log_test("Invalid Token Security", "FAIL", str(e), time.time() - start_time)

        # SQL Injection Test
        start_time = time.time()
        try:
            malicious_payloads = [
                "'; DROP TABLE users; --",
                "' OR '1'='1",
                "admin'/*"
            ]
            
            for payload in malicious_payloads:
                wait_for_rate_limit()
                response = requests.post(f"{self.base_url}/api/v1/auth/login", json={
                    "email": payload,
                    "password": "password123"
                })
                if response.status_code not in [422, 401, 400]:
                    log_test("SQL Injection Protection", "FAIL", f"Payload accepted: {payload}")
                    return
            
            log_test("SQL Injection Protection", "PASS", "All malicious payloads rejected", time.time() - start_time)
        except Exception as e:
            log_test("SQL Injection Protection", "FAIL", str(e), time.time() - start_time)

    def test_edge_cases(self):
        """Test edge cases and boundary conditions"""
        
        # Empty Data Test
        start_time = time.time()
        try:
            wait_for_rate_limit()
            response = requests.post(f"{self.base_url}/api/v1/auth/login", json={})
            if response.status_code in [400, 422]:
                log_test("Empty Data Handling", "PASS", "Empty data rejected", time.time() - start_time)
            else:
                log_test("Empty Data Handling", "FAIL", f"Empty data accepted: {response.status_code}", time.time() - start_time)
        except Exception as e:
            log_test("Empty Data Handling", "FAIL", str(e), time.time() - start_time)

        # Large Data Test
        start_time = time.time()
        try:
            wait_for_rate_limit()
            large_string = "A" * 5000  # 5KB string
            response = requests.post(f"{self.base_url}/api/v1/auth/register", json={
                "email": generate_test_email(),
                "password": "SecurePass123!",
                "first_name": large_string,
                "last_name": "User",
                "company_name": "Test Company",
                "role": "client",
                "data_processing_consent": True
            })
            
            if response.status_code in [400, 422]:
                log_test("Large Data Handling", "PASS", "Large data rejected", time.time() - start_time)
            else:
                log_test("Large Data Handling", "WARN", "Large data accepted - check limits", time.time() - start_time)
        except Exception as e:
            log_test("Large Data Handling", "FAIL", str(e), time.time() - start_time)

    def test_data_validation(self):
        """Test data validation rules"""
        
        # Email Format Validation
        start_time = time.time()
        try:
            invalid_emails = [
                "invalid-email",
                "@example.com",
                "test@",
                "test..test@example.com"
            ]
            
            for email in invalid_emails:
                wait_for_rate_limit()
                response = requests.post(f"{self.base_url}/api/v1/auth/register", json={
                    "email": email,
                    "password": "SecurePass123!",
                    "first_name": "Test",
                    "last_name": "User",
                    "company_name": "Test Company",
                    "role": "client",
                    "data_processing_consent": True
                })
                
                if response.status_code not in [400, 422]:
                    log_test("Email Format Validation", "FAIL", f"Invalid email accepted: {email}")
                    return
            
            log_test("Email Format Validation", "PASS", "All invalid emails rejected", time.time() - start_time)
        except Exception as e:
            log_test("Email Format Validation", "FAIL", str(e), time.time() - start_time)

        # Password Strength Validation
        start_time = time.time()
        try:
            weak_passwords = [
                "123",
                "password",
                "12345678",
                "abc"
            ]
            
            for password in weak_passwords:
                wait_for_rate_limit()
                response = requests.post(f"{self.base_url}/api/v1/auth/register", json={
                    "email": generate_test_email(),
                    "password": password,
                    "first_name": "Test",
                    "last_name": "User",
                    "company_name": "Test Company",
                    "role": "client",
                    "data_processing_consent": True
                })
                
                if response.status_code not in [400, 422]:
                    log_test("Password Strength Validation", "FAIL", f"Weak password accepted: {password}")
                    return
            
            log_test("Password Strength Validation", "PASS", "All weak passwords rejected", time.time() - start_time)
        except Exception as e:
            log_test("Password Strength Validation", "FAIL", str(e), time.time() - start_time)

    def test_api_compliance(self):
        """Test API compliance and standards"""
        
        # HTTP Method Validation
        start_time = time.time()
        try:
            unsupported_methods = ['PATCH', 'DELETE']
            
            for method in unsupported_methods:
                wait_for_rate_limit()
                response = requests.request(method, f"{self.base_url}/api/v1/auth/login")
                if response.status_code not in [405, 404]:
                    log_test("HTTP Method Validation", "FAIL", f"Method {method} not properly handled")
                    return
            
            log_test("HTTP Method Validation", "PASS", "Unsupported methods handled correctly", time.time() - start_time)
        except Exception as e:
            log_test("HTTP Method Validation", "FAIL", str(e), time.time() - start_time)

        # Content-Type Validation
        start_time = time.time()
        try:
            wait_for_rate_limit()
            response = requests.post(
                f"{self.base_url}/api/v1/auth/login",
                data="email=test@example.com&password=test123",
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            if response.status_code in [400, 422, 415]:
                log_test("Content-Type Validation", "PASS", "Wrong content-type rejected", time.time() - start_time)
            else:
                log_test("Content-Type Validation", "WARN", "Wrong content-type accepted", time.time() - start_time)
        except Exception as e:
            log_test("Content-Type Validation", "FAIL", str(e), time.time() - start_time)

    def generate_comprehensive_report(self):
        """Generate comprehensive test report"""
        print("\n" + "="*70)
        print("📊 COMPREHENSIVE TEST RESULTS SUMMARY")
        print("="*70)
        
        total_tests = len(TEST_RESULTS)
        passed_tests = len([r for r in TEST_RESULTS if r["status"] == "PASS"])
        failed_tests = len([r for r in TEST_RESULTS if r["status"] == "FAIL"])
        warning_tests = len([r for r in TEST_RESULTS if r["status"] == "WARN"])
        skipped_tests = len([r for r in TEST_RESULTS if r["status"] == "SKIP"])
        
        print(f"📋 Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"⚠️  Warnings: {warning_tests}")
        print(f"⏭️  Skipped: {skipped_tests}")
        print(f"🎯 Success Rate: {(passed_tests/max(total_tests-skipped_tests, 1))*100:.1f}%")
        
        print(f"\n👥 Test Users Created: {len(self.test_users)}")
        print(f"🔑 Authentication Tokens: {len(self.test_tokens)}")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in TEST_RESULTS:
                if result["status"] == "FAIL":
                    print(f"  - {result['test']}: {result['details']}")
        
        if warning_tests > 0:
            print("\n⚠️  WARNING TESTS:")
            for result in TEST_RESULTS:
                if result["status"] == "WARN":
                    print(f"  - {result['test']}: {result['details']}")
        
        # Save detailed report
        with open("COMPREHENSIVE_TEST_RESULTS.md", "w") as f:
            f.write("# 🔬 COMPREHENSIVE TEST RESULTS - MANUFACTURING PLATFORM\n\n")
            f.write(f"**Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"**Total Tests:** {total_tests}\n")
            f.write(f"**Success Rate:** {(passed_tests/max(total_tests-skipped_tests, 1))*100:.1f}%\n\n")
            
            f.write("## 📊 Test Summary\n\n")
            f.write(f"- ✅ **Passed:** {passed_tests}\n")
            f.write(f"- ❌ **Failed:** {failed_tests}\n")
            f.write(f"- ⚠️ **Warnings:** {warning_tests}\n")
            f.write(f"- ⏭️ **Skipped:** {skipped_tests}\n\n")
            
            f.write("## 👥 Test Environment\n\n")
            f.write(f"- **Test Users Created:** {len(self.test_users)}\n")
            f.write(f"- **Authentication Tokens:** {len(self.test_tokens)}\n")
            f.write(f"- **Base URL:** {self.base_url}\n\n")
            
            f.write("## 📋 Detailed Results\n\n")
            for result in TEST_RESULTS:
                status_emoji = "✅" if result["status"] == "PASS" else "❌" if result["status"] == "FAIL" else "⚠️" if result["status"] == "WARN" else "⏭️"
                f.write(f"### {status_emoji} {result['test']}\n")
                f.write(f"- **Status:** {result['status']}\n")
                f.write(f"- **Duration:** {result['duration']}\n")
                f.write(f"- **Timestamp:** {result['timestamp']}\n")
                if result['details']:
                    f.write(f"- **Details:** {result['details']}\n")
                f.write("\n")
        
        print(f"\n📄 Detailed report saved to: COMPREHENSIVE_TEST_RESULTS.md")

def main():
    """Main test execution"""
    print("🔬 MANUFACTURING PLATFORM - COMPREHENSIVE TESTING SUITE")
    print("=" * 70)
    
    # Check if server is running
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code != 200:
            print("❌ Server is not responding correctly!")
            print("Please ensure the backend server is running on http://localhost:8000")
            return
    except requests.exceptions.RequestException:
        print("❌ Cannot connect to server!")
        print("Please ensure the backend server is running on http://localhost:8000")
        return
    
    print("✅ Server is running - Starting comprehensive tests...")
    print("⚠️  Note: Tests include rate limiting delays to prevent API throttling\n")
    
    # Run all comprehensive tests
    test_suite = ComprehensiveTestSuite()
    test_suite.run_all_tests()

if __name__ == "__main__":
    main() 
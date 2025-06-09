#!/usr/bin/env python3
"""
🔬 ADVANCED TESTING SCENARIOS - MANUFACTURING PLATFORM
=====================================================

Comprehensive test suite covering:
- Edge cases and error conditions
- Security vulnerabilities
- Performance under load
- Complex business workflows
- Data integrity and validation
- Concurrent operations
- API rate limiting
- Database constraints
"""

import asyncio
import json
import time
import threading
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

def generate_random_string(length=10):
    """Generate random string for testing"""
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

def generate_test_email():
    """Generate unique test email"""
    return f"test_{generate_random_string(8)}@example.com"

class AdvancedTestSuite:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.test_users = []
        self.test_orders = []
        
    def run_all_tests(self):
        """Execute all advanced test scenarios"""
        print("🚀 STARTING ADVANCED TEST SCENARIOS")
        print("=" * 50)
        
        # Test categories
        test_categories = [
            ("🔐 Security Tests", self.run_security_tests),
            ("⚡ Performance Tests", self.run_performance_tests),
            ("🎯 Edge Case Tests", self.run_edge_case_tests),
            ("🔄 Concurrency Tests", self.run_concurrency_tests),
            ("📊 Data Validation Tests", self.run_data_validation_tests),
            ("🌐 API Behavior Tests", self.run_api_behavior_tests),
            ("💼 Business Logic Tests", self.run_business_logic_tests),
            ("🛡️ Error Handling Tests", self.run_error_handling_tests)
        ]
        
        for category_name, test_function in test_categories:
            print(f"\n{category_name}")
            print("-" * 30)
            try:
                test_function()
            except Exception as e:
                log_test(f"{category_name} - CRITICAL ERROR", "FAIL", str(e))
        
        self.generate_report()

    def run_security_tests(self):
        """Test security vulnerabilities and attack vectors"""
        
        # SQL Injection Tests
        start_time = time.time()
        try:
            malicious_payloads = [
                "'; DROP TABLE users; --",
                "' OR '1'='1",
                "admin'/*",
                "' UNION SELECT * FROM users --"
            ]
            
            for payload in malicious_payloads:
                response = requests.post(f"{self.base_url}/api/v1/auth/login", json={
                    "email": payload,
                    "password": "password123"
                })
                if response.status_code != 422 and response.status_code != 401:
                    log_test("SQL Injection Protection", "FAIL", f"Payload accepted: {payload}")
                    return
            
            log_test("SQL Injection Protection", "PASS", "All malicious payloads rejected", time.time() - start_time)
        except Exception as e:
            log_test("SQL Injection Protection", "FAIL", str(e), time.time() - start_time)

        # XSS Protection Tests
        start_time = time.time()
        try:
            xss_payloads = [
                "<script>alert('xss')</script>",
                "javascript:alert('xss')",
                "<img src=x onerror=alert('xss')>",
                "';alert('xss');//"
            ]
            
            test_email = generate_test_email()
            for payload in xss_payloads:
                response = requests.post(f"{self.base_url}/api/v1/auth/register", json={
                    "email": test_email,
                    "password": "SecurePass123!",
                    "full_name": payload,
                    "company_name": "Test Company",
                    "role": "client",
                    "gdpr_consent": True
                })
                
                if response.status_code == 201:
                    # Check if XSS payload was sanitized
                    login_response = requests.post(f"{self.base_url}/api/v1/auth/login", json={
                        "email": test_email,
                        "password": "SecurePass123!"
                    })
                    if login_response.status_code == 200:
                        token = login_response.json()["access_token"]
                        profile_response = requests.get(
                            f"{self.base_url}/api/v1/auth/me",
                            headers={"Authorization": f"Bearer {token}"}
                        )
                        if profile_response.status_code == 200:
                            profile_data = profile_response.json()
                            if "<script>" in profile_data.get("full_name", ""):
                                log_test("XSS Protection", "FAIL", f"XSS payload not sanitized: {payload}")
                                return
            
            log_test("XSS Protection", "PASS", "All XSS payloads handled safely", time.time() - start_time)
        except Exception as e:
            log_test("XSS Protection", "FAIL", str(e), time.time() - start_time)

        # JWT Token Security Tests
        start_time = time.time()
        try:
            # Test with invalid JWT tokens
            invalid_tokens = [
                "invalid.token.here",
                "Bearer malicious_token",
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature",
                ""
            ]
            
            for token in invalid_tokens:
                response = requests.get(
                    f"{self.base_url}/api/v1/auth/me",
                    headers={"Authorization": f"Bearer {token}"}
                )
                if response.status_code != 401 and response.status_code != 422:
                    log_test("JWT Token Security", "FAIL", f"Invalid token accepted: {token}")
                    return
            
            log_test("JWT Token Security", "PASS", "All invalid tokens rejected", time.time() - start_time)
        except Exception as e:
            log_test("JWT Token Security", "FAIL", str(e), time.time() - start_time)

    def run_performance_tests(self):
        """Test system performance under various loads"""
        
        # Concurrent Registration Test
        start_time = time.time()
        try:
            def register_user(index):
                email = f"perf_test_{index}_{generate_random_string(5)}@example.com"
                response = requests.post(f"{self.base_url}/api/v1/auth/register", json={
                    "email": email,
                    "password": "SecurePass123!",
                    "full_name": f"Performance Test User {index}",
                    "company_name": f"Test Company {index}",
                    "role": "client",
                    "gdpr_consent": True
                })
                return response.status_code == 201
            
            # Test with 20 concurrent registrations
            with ThreadPoolExecutor(max_workers=20) as executor:
                futures = [executor.submit(register_user, i) for i in range(20)]
                results = [future.result() for future in as_completed(futures)]
            
            success_rate = sum(results) / len(results) * 100
            duration = time.time() - start_time
            
            if success_rate >= 90:
                log_test("Concurrent Registration Performance", "PASS", 
                        f"Success rate: {success_rate:.1f}%", duration)
            else:
                log_test("Concurrent Registration Performance", "FAIL", 
                        f"Success rate: {success_rate:.1f}%", duration)
        except Exception as e:
            log_test("Concurrent Registration Performance", "FAIL", str(e), time.time() - start_time)

        # API Response Time Test
        start_time = time.time()
        try:
            response_times = []
            for _ in range(10):
                req_start = time.time()
                response = requests.get(f"{self.base_url}/health")
                req_duration = time.time() - req_start
                response_times.append(req_duration)
                
                if response.status_code != 200:
                    log_test("API Response Time", "FAIL", "Health check failed")
                    return
            
            avg_response_time = sum(response_times) / len(response_times)
            max_response_time = max(response_times)
            
            if avg_response_time < 0.1 and max_response_time < 0.5:
                log_test("API Response Time", "PASS", 
                        f"Avg: {avg_response_time:.3f}s, Max: {max_response_time:.3f}s", 
                        time.time() - start_time)
            else:
                log_test("API Response Time", "WARN", 
                        f"Slow response - Avg: {avg_response_time:.3f}s, Max: {max_response_time:.3f}s", 
                        time.time() - start_time)
        except Exception as e:
            log_test("API Response Time", "FAIL", str(e), time.time() - start_time)

    def run_edge_case_tests(self):
        """Test edge cases and boundary conditions"""
        
        # Empty and Null Data Tests
        start_time = time.time()
        try:
            edge_cases = [
                {"email": "", "password": "test123"},
                {"email": None, "password": "test123"},
                {"email": "test@example.com", "password": ""},
                {"email": "test@example.com", "password": None},
                {},
                {"email": "test@example.com"}  # Missing password
            ]
            
            for case in edge_cases:
                response = requests.post(f"{self.base_url}/api/v1/auth/login", json=case)
                if response.status_code not in [400, 422]:
                    log_test("Empty/Null Data Handling", "FAIL", f"Invalid data accepted: {case}")
                    return
            
            log_test("Empty/Null Data Handling", "PASS", "All invalid data rejected", time.time() - start_time)
        except Exception as e:
            log_test("Empty/Null Data Handling", "FAIL", str(e), time.time() - start_time)

        # Extremely Long Input Tests
        start_time = time.time()
        try:
            long_string = "A" * 10000  # 10KB string
            response = requests.post(f"{self.base_url}/api/v1/auth/register", json={
                "email": f"test_{generate_random_string(5)}@example.com",
                "password": "SecurePass123!",
                "full_name": long_string,
                "company_name": "Test Company",
                "role": "client",
                "gdpr_consent": True
            })
            
            if response.status_code in [400, 422]:
                log_test("Long Input Handling", "PASS", "Extremely long input rejected", time.time() - start_time)
            else:
                log_test("Long Input Handling", "WARN", "Long input accepted - check limits", time.time() - start_time)
        except Exception as e:
            log_test("Long Input Handling", "FAIL", str(e), time.time() - start_time)

        # Special Characters Test
        start_time = time.time()
        try:
            special_chars = "!@#$%^&*()_+-=[]{}|;':\",./<>?`~"
            test_email = generate_test_email()
            
            response = requests.post(f"{self.base_url}/api/v1/auth/register", json={
                "email": test_email,
                "password": "SecurePass123!",
                "full_name": f"Test User {special_chars}",
                "company_name": f"Company {special_chars}",
                "role": "client",
                "gdpr_consent": True
            })
            
            if response.status_code == 201:
                log_test("Special Characters Handling", "PASS", "Special characters handled correctly", time.time() - start_time)
            else:
                log_test("Special Characters Handling", "FAIL", f"Special characters rejected: {response.status_code}", time.time() - start_time)
        except Exception as e:
            log_test("Special Characters Handling", "FAIL", str(e), time.time() - start_time)

    def run_concurrency_tests(self):
        """Test concurrent operations and race conditions"""
        
        # Concurrent Login Test
        start_time = time.time()
        try:
            # First create a test user
            test_email = generate_test_email()
            register_response = requests.post(f"{self.base_url}/api/v1/auth/register", json={
                "email": test_email,
                "password": "SecurePass123!",
                "full_name": "Concurrency Test User",
                "company_name": "Test Company",
                "role": "client",
                "gdpr_consent": True
            })
            
            if register_response.status_code != 201:
                log_test("Concurrent Login Setup", "FAIL", "Failed to create test user")
                return
            
            def login_user():
                response = requests.post(f"{self.base_url}/api/v1/auth/login", json={
                    "email": test_email,
                    "password": "SecurePass123!"
                })
                return response.status_code == 200
            
            # Test with 10 concurrent logins
            with ThreadPoolExecutor(max_workers=10) as executor:
                futures = [executor.submit(login_user) for _ in range(10)]
                results = [future.result() for future in as_completed(futures)]
            
            success_rate = sum(results) / len(results) * 100
            
            if success_rate >= 90:
                log_test("Concurrent Login", "PASS", f"Success rate: {success_rate:.1f}%", time.time() - start_time)
            else:
                log_test("Concurrent Login", "FAIL", f"Success rate: {success_rate:.1f}%", time.time() - start_time)
        except Exception as e:
            log_test("Concurrent Login", "FAIL", str(e), time.time() - start_time)

    def run_data_validation_tests(self):
        """Test data validation and constraints"""
        
        # Email Format Validation
        start_time = time.time()
        try:
            invalid_emails = [
                "invalid-email",
                "@example.com",
                "test@",
                "test..test@example.com",
                "test@example",
                "test@.com"
            ]
            
            for email in invalid_emails:
                response = requests.post(f"{self.base_url}/api/v1/auth/register", json={
                    "email": email,
                    "password": "SecurePass123!",
                    "full_name": "Test User",
                    "company_name": "Test Company",
                    "role": "client",
                    "gdpr_consent": True
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
                "abc",
                ""
            ]
            
            for password in weak_passwords:
                response = requests.post(f"{self.base_url}/api/v1/auth/register", json={
                    "email": generate_test_email(),
                    "password": password,
                    "full_name": "Test User",
                    "company_name": "Test Company",
                    "role": "client",
                    "gdpr_consent": True
                })
                
                if response.status_code not in [400, 422]:
                    log_test("Password Strength Validation", "FAIL", f"Weak password accepted: {password}")
                    return
            
            log_test("Password Strength Validation", "PASS", "All weak passwords rejected", time.time() - start_time)
        except Exception as e:
            log_test("Password Strength Validation", "FAIL", str(e), time.time() - start_time)

    def run_api_behavior_tests(self):
        """Test API behavior and HTTP standards compliance"""
        
        # HTTP Method Tests
        start_time = time.time()
        try:
            # Test unsupported methods
            unsupported_methods = ['PATCH', 'DELETE', 'PUT']
            
            for method in unsupported_methods:
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
            # Test with wrong content type
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

    def run_business_logic_tests(self):
        """Test business logic and workflow validation"""
        
        # Duplicate Email Registration Test
        start_time = time.time()
        try:
            test_email = generate_test_email()
            
            # First registration
            response1 = requests.post(f"{self.base_url}/api/v1/auth/register", json={
                "email": test_email,
                "password": "SecurePass123!",
                "full_name": "Test User 1",
                "company_name": "Test Company 1",
                "role": "client",
                "gdpr_consent": True
            })
            
            # Second registration with same email
            response2 = requests.post(f"{self.base_url}/api/v1/auth/register", json={
                "email": test_email,
                "password": "DifferentPass123!",
                "full_name": "Test User 2",
                "company_name": "Test Company 2",
                "role": "manufacturer",
                "gdpr_consent": True
            })
            
            if response1.status_code == 201 and response2.status_code in [400, 409, 422]:
                log_test("Duplicate Email Prevention", "PASS", "Duplicate email registration prevented", time.time() - start_time)
            else:
                log_test("Duplicate Email Prevention", "FAIL", 
                        f"Duplicate email handling failed: {response1.status_code}, {response2.status_code}", 
                        time.time() - start_time)
        except Exception as e:
            log_test("Duplicate Email Prevention", "FAIL", str(e), time.time() - start_time)

    def run_error_handling_tests(self):
        """Test error handling and recovery"""
        
        # Invalid Endpoint Test
        start_time = time.time()
        try:
            response = requests.get(f"{self.base_url}/api/v1/nonexistent-endpoint")
            
            if response.status_code == 404:
                log_test("Invalid Endpoint Handling", "PASS", "404 returned for invalid endpoint", time.time() - start_time)
            else:
                log_test("Invalid Endpoint Handling", "FAIL", f"Unexpected status: {response.status_code}", time.time() - start_time)
        except Exception as e:
            log_test("Invalid Endpoint Handling", "FAIL", str(e), time.time() - start_time)

        # Malformed JSON Test
        start_time = time.time()
        try:
            response = requests.post(
                f"{self.base_url}/api/v1/auth/login",
                data='{"email": "test@example.com", "password": "incomplete',
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code in [400, 422]:
                log_test("Malformed JSON Handling", "PASS", "Malformed JSON rejected", time.time() - start_time)
            else:
                log_test("Malformed JSON Handling", "FAIL", f"Malformed JSON accepted: {response.status_code}", time.time() - start_time)
        except Exception as e:
            log_test("Malformed JSON Handling", "FAIL", str(e), time.time() - start_time)

    def generate_report(self):
        """Generate comprehensive test report"""
        print("\n" + "="*60)
        print("📊 ADVANCED TEST RESULTS SUMMARY")
        print("="*60)
        
        total_tests = len(TEST_RESULTS)
        passed_tests = len([r for r in TEST_RESULTS if r["status"] == "PASS"])
        failed_tests = len([r for r in TEST_RESULTS if r["status"] == "FAIL"])
        warning_tests = len([r for r in TEST_RESULTS if r["status"] == "WARN"])
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"⚠️  Warnings: {warning_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
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
        with open("ADVANCED_TEST_RESULTS.md", "w") as f:
            f.write("# 🔬 ADVANCED TEST RESULTS - MANUFACTURING PLATFORM\n\n")
            f.write(f"**Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"**Total Tests:** {total_tests}\n")
            f.write(f"**Success Rate:** {(passed_tests/total_tests)*100:.1f}%\n\n")
            
            f.write("## 📊 Test Summary\n\n")
            f.write(f"- ✅ **Passed:** {passed_tests}\n")
            f.write(f"- ❌ **Failed:** {failed_tests}\n")
            f.write(f"- ⚠️ **Warnings:** {warning_tests}\n\n")
            
            f.write("## 📋 Detailed Results\n\n")
            for result in TEST_RESULTS:
                status_emoji = "✅" if result["status"] == "PASS" else "❌" if result["status"] == "FAIL" else "⚠️"
                f.write(f"### {status_emoji} {result['test']}\n")
                f.write(f"- **Status:** {result['status']}\n")
                f.write(f"- **Duration:** {result['duration']}\n")
                f.write(f"- **Timestamp:** {result['timestamp']}\n")
                if result['details']:
                    f.write(f"- **Details:** {result['details']}\n")
                f.write("\n")
        
        print(f"\n📄 Detailed report saved to: ADVANCED_TEST_RESULTS.md")

def main():
    """Main test execution"""
    print("🔬 MANUFACTURING PLATFORM - ADVANCED TESTING SUITE")
    print("=" * 60)
    
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
    
    print("✅ Server is running - Starting advanced tests...\n")
    
    # Run all advanced tests
    test_suite = AdvancedTestSuite()
    test_suite.run_all_tests()

if __name__ == "__main__":
    main() 
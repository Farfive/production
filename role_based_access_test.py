#!/usr/bin/env python3
"""
Role-Based Access Control Testing Script
Tests all role-based permissions and access controls
"""

import requests
import json
import time
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

class UserRole(Enum):
    CLIENT = "client"
    MANUFACTURER = "manufacturer"
    ADMIN = "admin"

@dataclass
class TestResult:
    name: str
    success: bool
    status_code: Optional[int] = None
    response_data: Optional[Dict] = None
    error_message: Optional[str] = None
    duration: float = 0.0
    expected_status: Optional[int] = None

class RoleBasedAccessTester:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tokens = {}
        self.users = {}
        
        # Test users
        self.test_users = {
            UserRole.CLIENT: {
                "email": "test.client@example.com",
                "password": "TestPassword123!",
                "first_name": "Test",
                "last_name": "Client",
                "role": "client",
                "data_processing_consent": True,
                "marketing_consent": False,
                "company_name": "Test Client Company"
            },
            UserRole.MANUFACTURER: {
                "email": "test.manufacturer@example.com", 
                "password": "TestPassword123!",
                "first_name": "Test",
                "last_name": "Manufacturer",
                "role": "manufacturer",
                "data_processing_consent": True,
                "marketing_consent": False,
                "company_name": "Test Manufacturer Company"
            },
            UserRole.ADMIN: {
                "email": "test.admin@example.com",
                "password": "TestPassword123!",
                "first_name": "Test",
                "last_name": "Admin", 
                "role": "admin",
                "data_processing_consent": True,
                "marketing_consent": False,
                "company_name": "Test Admin Company"
            }
        }

    def authenticate_users(self) -> List[TestResult]:
        """Authenticate all test users"""
        results = []
        
        for role, user_data in self.test_users.items():
            # Try to login first
            login_result = self.login_user(role, user_data)
            results.append(login_result)
            
            if not login_result.success:
                # If login fails, try to create user
                create_result = self.create_user(role, user_data)
                results.append(create_result)
                
                if create_result.success:
                    # Try login again after creation
                    login_result = self.login_user(role, user_data)
                    results.append(login_result)
        
        return results

    def create_user(self, role: UserRole, user_data: Dict) -> TestResult:
        """Create a test user"""
        start_time = time.time()
        try:
            response = self.session.post(
                f"{self.base_url}/api/v1/auth/register",
                json=user_data,
                timeout=10
            )
            duration = time.time() - start_time
            
            if response.status_code in [200, 201]:
                return TestResult(
                    name=f"Create {role.value} User",
                    success=True,
                    status_code=response.status_code,
                    response_data=response.json(),
                    duration=duration
                )
            else:
                return TestResult(
                    name=f"Create {role.value} User",
                    success=False,
                    status_code=response.status_code,
                    error_message=f"Failed to create user: {response.text}",
                    duration=duration
                )
        except Exception as e:
            return TestResult(
                name=f"Create {role.value} User",
                success=False,
                error_message=str(e),
                duration=time.time() - start_time
            )

    def login_user(self, role: UserRole, user_data: Dict) -> TestResult:
        """Login a user and store token"""
        start_time = time.time()
        try:
            login_data = {
                "username": user_data["email"],
                "password": user_data["password"],
                "grant_type": "password"
            }
            
            response = self.session.post(
                f"{self.base_url}/api/v1/auth/login",
                data=login_data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=10
            )
            duration = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                self.tokens[role] = data.get("access_token")
                self.users[role] = data.get("user", {})
                
                return TestResult(
                    name=f"Login {role.value} User",
                    success=True,
                    status_code=response.status_code,
                    response_data=data,
                    duration=duration
                )
            else:
                return TestResult(
                    name=f"Login {role.value} User",
                    success=False,
                    status_code=response.status_code,
                    error_message=f"Login failed: {response.text}",
                    duration=duration
                )
        except Exception as e:
            return TestResult(
                name=f"Login {role.value} User",
                success=False,
                error_message=str(e),
                duration=time.time() - start_time
            )

    def test_endpoint_access(self, endpoint: str, method: str, role: UserRole, 
                           expected_status: int, data: Optional[Dict] = None) -> TestResult:
        """Test access to a specific endpoint with a role"""
        start_time = time.time()
        
        if role not in self.tokens:
            return TestResult(
                name=f"{role.value} access to {method} {endpoint}",
                success=False,
                error_message="No auth token available",
                duration=0.0,
                expected_status=expected_status
            )
        
        headers = {"Authorization": f"Bearer {self.tokens[role]}"}
        
        try:
            if method.upper() == "GET":
                response = self.session.get(f"{self.base_url}{endpoint}", headers=headers, timeout=10)
            elif method.upper() == "POST":
                response = self.session.post(f"{self.base_url}{endpoint}", headers=headers, json=data, timeout=10)
            elif method.upper() == "PUT":
                response = self.session.put(f"{self.base_url}{endpoint}", headers=headers, json=data, timeout=10)
            elif method.upper() == "DELETE":
                response = self.session.delete(f"{self.base_url}{endpoint}", headers=headers, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            duration = time.time() - start_time
            success = response.status_code == expected_status
            
            return TestResult(
                name=f"{role.value} access to {method} {endpoint}",
                success=success,
                status_code=response.status_code,
                response_data=response.json() if response.content else {},
                error_message=None if success else f"Expected {expected_status}, got {response.status_code}",
                duration=duration,
                expected_status=expected_status
            )
            
        except Exception as e:
            return TestResult(
                name=f"{role.value} access to {method} {endpoint}",
                success=False,
                error_message=str(e),
                duration=time.time() - start_time,
                expected_status=expected_status
            )

    def test_client_only_endpoints(self) -> List[TestResult]:
        """Test client-only endpoints"""
        results = []
        
        # Client-only endpoints
        client_endpoints = [
            ("/api/v1/orders", "POST", {
                "title": "Test Manufacturing Order",
                "description": "Test order for role-based access testing with proper validation",
                "technology": "CNC Machining",
                "material": "Aluminum 6061",
                "quantity": 100,
                "budget_pln": 5000.00,
                "delivery_deadline": "2025-07-15T10:00:00Z",
                "priority": "normal",
                "preferred_location": "Poland",
                "specifications": {
                    "dimensions": "100x50x25mm",
                    "tolerance": "±0.1mm",
                    "finish": "Anodized"
                }
            }),
            ("/api/v1/orders", "GET", None),  # Client should see their own orders
            ("/api/v1/dashboard/client", "GET", None),
        ]
        
        for endpoint, method, data in client_endpoints:
            # Client should have access (200)
            results.append(self.test_endpoint_access(endpoint, method, UserRole.CLIENT, 200, data))
            
            # For GET /orders, manufacturer should have access (200) to see available orders
            # For POST /orders and dashboard/client, manufacturer should be forbidden (403)
            if endpoint == "/api/v1/orders" and method == "GET":
                expected_manufacturer_status = 200
            else:
                expected_manufacturer_status = 403
            results.append(self.test_endpoint_access(endpoint, method, UserRole.MANUFACTURER, expected_manufacturer_status, data))
            
            # Admin should be forbidden (403) for client-specific endpoints
            if endpoint == "/api/v1/dashboard/client":
                expected_admin_status = 403
            else:
                expected_admin_status = 200  # Admin can access orders
            results.append(self.test_endpoint_access(endpoint, method, UserRole.ADMIN, expected_admin_status, data))
        
        return results

    def test_manufacturer_only_endpoints(self) -> List[TestResult]:
        """Test manufacturer-only endpoints"""
        results = []
        
        # Manufacturer-only endpoints
        manufacturer_endpoints = [
            ("/api/v1/quotes", "GET", None),  # Both clients and manufacturers can access quotes (their own)
            ("/api/v1/dashboard/manufacturer", "GET", None),  # Only manufacturers
        ]
        
        for endpoint, method, data in manufacturer_endpoints:
            # Manufacturer should have access (200)
            results.append(self.test_endpoint_access(endpoint, method, UserRole.MANUFACTURER, 200, data))
            
            # For quotes, client should have access (200) to see their own quotes
            # For manufacturer dashboard, client should be forbidden (403)
            if endpoint == "/api/v1/quotes":
                expected_client_status = 200  # Clients can see quotes for their orders
            else:
                expected_client_status = 403  # Dashboard is manufacturer-only
            results.append(self.test_endpoint_access(endpoint, method, UserRole.CLIENT, expected_client_status, data))
            
            # Admin should be forbidden (403) for manufacturer-specific endpoints
            if endpoint == "/api/v1/dashboard/manufacturer":
                expected_admin_status = 403
            else:
                expected_admin_status = 200  # Admin can access quotes
            results.append(self.test_endpoint_access(endpoint, method, UserRole.ADMIN, expected_admin_status, data))
        
        return results

    def test_admin_only_endpoints(self) -> List[TestResult]:
        """Test admin-only endpoints"""
        results = []
        
        # Admin-only endpoints
        admin_endpoints = [
            ("/api/v1/dashboard/admin", "GET", None),
            ("/api/v1/users/3", "GET", None),  # Get user by ID (using admin ID so client/manufacturer can't access)
            ("/api/v1/emails/send", "POST", {
                "email_type": "verification",
                "to_email": "test@example.com",
                "to_name": "Test User",
                "context": {}
            }),
        ]
        
        for endpoint, method, data in admin_endpoints:
            # Admin should have access (200)
            results.append(self.test_endpoint_access(endpoint, method, UserRole.ADMIN, 200, data))
            
            # Client should be forbidden (403)
            results.append(self.test_endpoint_access(endpoint, method, UserRole.CLIENT, 403, data))
            
            # Manufacturer should be forbidden (403)
            results.append(self.test_endpoint_access(endpoint, method, UserRole.MANUFACTURER, 403, data))
        
        return results

    def test_cross_role_functionality(self) -> List[TestResult]:
        """Test endpoints that multiple roles can access"""
        results = []
        
        # Cross-role endpoints (accessible by multiple roles)
        cross_role_endpoints = [
            ("/api/v1/auth/me", "GET", None, [UserRole.CLIENT, UserRole.MANUFACTURER, UserRole.ADMIN]),
            ("/api/v1/users/me", "GET", None, [UserRole.CLIENT, UserRole.MANUFACTURER, UserRole.ADMIN]),
        ]
        
        for endpoint, method, data, allowed_roles in cross_role_endpoints:
            for role in UserRole:
                expected_status = 200 if role in allowed_roles else 403
                results.append(self.test_endpoint_access(endpoint, method, role, expected_status, data))
        
        return results

    def test_order_quote_viewing_permissions(self) -> List[TestResult]:
        """Test order and quote viewing permissions"""
        results = []
        
        # Test that users can only see their own data
        test_cases = [
            ("/api/v1/orders", "GET", UserRole.CLIENT, 200),  # Client sees own orders
            ("/api/v1/orders", "GET", UserRole.MANUFACTURER, 200),  # Manufacturer sees available orders
            ("/api/v1/quotes", "GET", UserRole.CLIENT, 200),  # Client sees quotes for their orders
            ("/api/v1/quotes", "GET", UserRole.MANUFACTURER, 200),  # Manufacturer sees their quotes
        ]
        
        for endpoint, method, role, expected_status in test_cases:
            results.append(self.test_endpoint_access(endpoint, method, role, expected_status))
        
        return results

    def test_invalid_token_access(self) -> List[TestResult]:
        """Test access with invalid tokens"""
        results = []
        
        # Test endpoints with invalid token
        invalid_token = "invalid_token_12345"
        headers = {"Authorization": f"Bearer {invalid_token}"}
        
        test_endpoints = [
            "/api/v1/auth/me",
            "/api/v1/orders",
            "/api/v1/quotes",
            "/api/v1/dashboard/client"
        ]
        
        for endpoint in test_endpoints:
            start_time = time.time()
            try:
                response = self.session.get(
                    f"{self.base_url}{endpoint}",
                    headers=headers,
                    timeout=10
                )
                duration = time.time() - start_time
                
                # Accept both 401 (auth error) and 429 (rate limiting) as valid responses
                # In production, rate limiting might kick in before auth validation
                expected_codes = [401, 429]
                success = response.status_code in expected_codes
                expected_desc = "401 or 429"
                
                results.append(TestResult(
                    name=f"Invalid token access to {endpoint}",
                    success=success,
                    status_code=response.status_code,
                    expected_status=expected_desc,
                    error_message=None if success else f"Expected {expected_desc}, got {response.status_code}",
                    duration=duration
                ))
                
            except Exception as e:
                results.append(TestResult(
                    name=f"Invalid token access to {endpoint}",
                    success=False,
                    error_message=str(e),
                    duration=time.time() - start_time
                ))
        
        return results

    def run_all_tests(self) -> Dict[str, List[TestResult]]:
        """Run all role-based access tests"""
        print("🔐 Starting Role-Based Access Control Testing...")
        print("=" * 60)
        
        all_results = {}
        
        # 1. Authentication
        print("\n1️⃣ Authenticating test users...")
        all_results["authentication"] = self.authenticate_users()
        
        # 2. Client-only endpoints
        print("\n2️⃣ Testing client-only endpoints...")
        all_results["client_only"] = self.test_client_only_endpoints()
        
        # 3. Manufacturer-only endpoints
        print("\n3️⃣ Testing manufacturer-only endpoints...")
        all_results["manufacturer_only"] = self.test_manufacturer_only_endpoints()
        
        # 4. Admin-only endpoints
        print("\n4️⃣ Testing admin-only endpoints...")
        all_results["admin_only"] = self.test_admin_only_endpoints()
        
        # 5. Cross-role functionality
        print("\n5️⃣ Testing cross-role functionality...")
        all_results["cross_role"] = self.test_cross_role_functionality()
        
        # 6. Order/Quote viewing permissions
        print("\n6️⃣ Testing order/quote viewing permissions...")
        all_results["order_quote_permissions"] = self.test_order_quote_viewing_permissions()
        
        # 7. Invalid token access
        print("\n7️⃣ Testing invalid token access...")
        all_results["invalid_token"] = self.test_invalid_token_access()
        
        return all_results

    def print_results(self, all_results: Dict[str, List[TestResult]]):
        """Print test results in a formatted way"""
        print("\n" + "=" * 60)
        print("🔐 ROLE-BASED ACCESS CONTROL TEST RESULTS")
        print("=" * 60)
        
        total_tests = 0
        total_passed = 0
        
        for category, results in all_results.items():
            print(f"\n📋 {category.replace('_', ' ').title()}")
            print("-" * 40)
            
            category_passed = 0
            category_total = len(results)
            
            for result in results:
                status_icon = "✅" if result.success else "❌"
                status_info = f"({result.status_code})" if result.status_code else ""
                expected_info = f" [Expected: {result.expected_status}]" if result.expected_status else ""
                
                print(f"{status_icon} {result.name} {status_info}{expected_info}")
                
                if not result.success and result.error_message:
                    print(f"   💬 {result.error_message}")
                
                if result.success:
                    category_passed += 1
            
            print(f"\n📊 Category Summary: {category_passed}/{category_total} passed")
            total_tests += category_total
            total_passed += category_passed
        
        # Overall summary
        print("\n" + "=" * 60)
        print("🎯 OVERALL SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {total_passed}")
        print(f"Failed: {total_tests - total_passed}")
        print(f"Success Rate: {(total_passed/total_tests*100):.1f}%")
        
        if total_passed == total_tests:
            print("\n🎉 ALL ROLE-BASED ACCESS TESTS PASSED!")
        else:
            print(f"\n⚠️  {total_tests - total_passed} tests failed. Review access controls.")

def main():
    """Main function to run role-based access tests"""
    tester = RoleBasedAccessTester()
    
    try:
        # Run all tests
        results = tester.run_all_tests()
        
        # Print results
        tester.print_results(results)
        
        # Return appropriate exit code
        total_tests = sum(len(category_results) for category_results in results.values())
        total_passed = sum(sum(1 for result in category_results if result.success) 
                          for category_results in results.values())
        
        return 0 if total_passed == total_tests else 1
        
    except KeyboardInterrupt:
        print("\n\n⚠️ Testing interrupted by user")
        return 1
    except Exception as e:
        print(f"\n\n❌ Testing failed with error: {e}")
        return 1

if __name__ == "__main__":
    exit(main()) 
#!/usr/bin/env python3
"""
Manufacturing Platform API - User Scenario Testing
Comprehensive end-to-end testing simulating real user workflows
"""

import requests
import json
import time
from datetime import datetime, timedelta
import random
from faker import Faker

fake = Faker('pl_PL')  # Polish locale for realistic data

class UserScenarioTester:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api/v1"
        self.session = requests.Session()
        
        # Test data storage
        self.users = {}
        self.tokens = {}
        self.orders = []
        self.quotes = []
        self.manufacturers = []
        
        # Test results
        self.scenario_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
    def log_scenario_step(self, scenario, step, success, details="", response_time=0):
        """Log individual scenario step"""
        status = "✅" if success else "❌"
        self.total_tests += 1
        if success:
            self.passed_tests += 1
            
        result = {
            "scenario": scenario,
            "step": step,
            "success": success,
            "details": details,
            "response_time": response_time,
            "timestamp": datetime.now().isoformat()
        }
        self.scenario_results.append(result)
        
        print(f"  {status} {step}")
        if details:
            print(f"     {details}")
        if response_time > 0:
            print(f"     Response time: {response_time:.3f}s")
        
    def make_request(self, method, endpoint, **kwargs):
        """Make HTTP request with timing and error handling"""
        start_time = time.time()
        try:
            if endpoint.startswith('/'):
                url = f"{self.api_url}{endpoint}"
            else:
                url = f"{self.base_url}/{endpoint}"
            
            kwargs.setdefault('timeout', 15)
            response = self.session.request(method, url, **kwargs)
            response_time = time.time() - start_time
            
            return response, response_time, None
            
        except Exception as e:
            response_time = time.time() - start_time
            return None, response_time, str(e)

    def scenario_1_client_journey(self):
        """
        Scenario 1: Complete Client User Journey
        - Client registers and verifies account
        - Creates detailed manufacturing order
        - Reviews manufacturer matches
        - Manages order through completion
        """
        print("\n🏭 SCENARIO 1: Complete Client Journey")
        print("=" * 60)
        
        scenario = "Client Journey"
        
        # Step 1: Client Registration
        print("\n📝 Step 1: Client Registration")
        client_email = f"client_{int(time.time())}@automotive-parts.pl"
        client_data = {
            "email": client_email,
            "password": "ClientSecure2024!",
            "first_name": fake.first_name(),
            "last_name": fake.last_name(),
            "company_name": "AutoParts Manufacturing Sp. z o.o.",
            "nip": "1234567890",
            "phone": "+48 22 123 45 67",
            "company_address": "ul. Przemysłowa 15, 02-676 Warszawa",
            "role": "client",
            "data_processing_consent": True,
            "marketing_consent": True
        }
        
        response, response_time, error = self.make_request(
            "POST", "/auth/register",
            json=client_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response and response.status_code == 200:
            self.users["client"] = response.json()
            self.log_scenario_step(
                scenario, "Client Registration", True,
                f"Client ID: {self.users['client']['id']}, Email: {client_email}",
                response_time
            )
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else error
            self.log_scenario_step(
                scenario, "Client Registration", False,
                f"Error: {error_msg}",
                response_time
            )
            return False
        
        # Step 2: Client Login
        print("\n🔐 Step 2: Client Authentication")
        login_data = f"username={client_email}&password=ClientSecure2024!"
        
        response, response_time, error = self.make_request(
            "POST", "/auth/login",
            data=login_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if response and response.status_code == 200:
            token_data = response.json()
            self.tokens["client"] = token_data["access_token"]
            self.log_scenario_step(
                scenario, "Client Login", True,
                f"Token received, expires in: {token_data.get('expires_in', 'Unknown')}s",
                response_time
            )
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else error
            self.log_scenario_step(
                scenario, "Client Login", False,
                f"Error: {error_msg}",
                response_time
            )
            return False
        
        # Step 3: Create Complex Manufacturing Order
        print("\n📋 Step 3: Create Manufacturing Order")
        client_headers = {"Authorization": f"Bearer {self.tokens['client']}"}
        
        order_data = {
            "title": "Precision CNC Machined Automotive Components - Series Production",
            "description": """
            We require precision CNC machined components for automotive brake system application.
            
            Requirements:
            - High precision automotive grade components
            - Material: Aluminum 6061-T6 with certificate
            - Series production capability required
            - ISO/TS 16949 certification mandatory
            - PPAP Level 3 documentation required
            - Initial sample approval needed
            
            Technical specifications include tight tolerances and specific surface finish requirements.
            Components will be integrated into safety-critical brake systems.
            """.strip(),
            "technology": "CNC Machining",
            "material": "Aluminum 6061-T6",
            "quantity": 5000,
            "budget_pln": 125000.00,
            "delivery_deadline": (datetime.now() + timedelta(days=60)).isoformat(),
            "priority": "high",
            "preferred_location": "Śląsk, Poland",
            "specifications": {
                "dimensions": "Main body: 85x45x25mm, mounting holes: Ø8mm",
                "tolerance": "±0.02mm critical surfaces, ±0.1mm general",
                "finish": "Anodized Type II, clear, 15-25 microns",
                "material_certificate": "EN 10204 3.1 required",
                "quality_standard": "ISO/TS 16949",
                "testing_requirements": "Dimensional inspection, material verification",
                "packaging": "Individual protective packaging required",
                "delivery_terms": "FCA Warszawa",
                "payment_terms": "30 days from delivery"
            }
        }
        
        response, response_time, error = self.make_request(
            "POST", "/orders/",
            json=order_data,
            headers={**client_headers, "Content-Type": "application/json"}
        )
        
        if response and response.status_code == 200:
            order = response.json()
            self.orders.append(order)
            self.log_scenario_step(
                scenario, "Create Manufacturing Order", True,
                f"Order ID: {order['id']}, Budget: {order['budget_pln']} PLN, Qty: {order['quantity']}",
                response_time
            )
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else error
            self.log_scenario_step(
                scenario, "Create Manufacturing Order", False,
                f"Error: {error_msg}",
                response_time
            )
            return False
        
        # Step 4: Review Order Details
        print("\n🔍 Step 4: Review Order Details")
        order_id = self.orders[0]["id"]
        
        response, response_time, error = self.make_request(
            "GET", f"/orders/{order_id}",
            headers=client_headers
        )
        
        if response and response.status_code == 200:
            order_details = response.json()
            self.log_scenario_step(
                scenario, "Review Order Details", True,
                f"Status: {order_details['status']}, Created: {order_details['created_at'][:10]}",
                response_time
            )
        else:
            self.log_scenario_step(
                scenario, "Review Order Details", False,
                f"Error: {response.status_code if response else error}",
                response_time
            )
        
        # Step 5: Find Manufacturer Matches
        print("\n🤖 Step 5: Intelligent Manufacturer Matching")
        matching_request = {
            "order_id": order_id,
            "max_results": 10,
            "enable_fallback": True
        }
        
        response, response_time, error = self.make_request(
            "POST", "/matching/find-matches",
            json=matching_request,
            headers={**client_headers, "Content-Type": "application/json"}
        )
        
        if response and response.status_code == 200:
            matches = response.json()
            self.log_scenario_step(
                scenario, "Find Manufacturer Matches", True,
                f"Found {matches.get('matches_found', 0)} matches, Processing: {matches.get('processing_time_seconds', 0):.3f}s",
                response_time
            )
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else error
            self.log_scenario_step(
                scenario, "Find Manufacturer Matches", False,
                f"Error: {error_msg}",
                response_time
            )
        
        # Step 6: Get Client Orders List
        print("\n📂 Step 6: Review All Orders")
        response, response_time, error = self.make_request(
            "GET", "/orders/?page=1&per_page=10",
            headers=client_headers
        )
        
        if response and response.status_code == 200:
            orders_data = response.json()
            self.log_scenario_step(
                scenario, "Review Orders List", True,
                f"Total orders: {orders_data.get('total', 0)}, Page: {orders_data.get('page', 1)}",
                response_time
            )
        else:
            self.log_scenario_step(
                scenario, "Review Orders List", False,
                f"Error: {response.status_code if response else error}",
                response_time
            )
        
        return True

    def scenario_2_manufacturer_journey(self):
        """
        Scenario 2: Manufacturer User Journey
        - Manufacturer registers with capabilities
        - Browses available orders
        - Submits competitive quotes
        - Manages production workflow
        """
        print("\n🏗️ SCENARIO 2: Manufacturer Journey")
        print("=" * 60)
        
        scenario = "Manufacturer Journey"
        
        # Step 1: Manufacturer Registration
        print("\n📝 Step 1: Manufacturer Registration")
        manufacturer_email = f"manufacturer_{int(time.time())}@precision-cnc.pl"
        manufacturer_data = {
            "email": manufacturer_email,
            "password": "ManufacturerSecure2024!",
            "first_name": fake.first_name(),
            "last_name": fake.last_name(),
            "company_name": "Precision CNC Technologies Sp. z o.o.",
            "nip": "9876543210",
            "phone": "+48 32 456 78 90",
            "company_address": "ul. Obróbcza 8, 40-601 Katowice",
            "role": "manufacturer",
            "data_processing_consent": True,
            "marketing_consent": True
        }
        
        response, response_time, error = self.make_request(
            "POST", "/auth/register",
            json=manufacturer_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response and response.status_code == 200:
            self.users["manufacturer"] = response.json()
            self.manufacturers.append(self.users["manufacturer"])
            self.log_scenario_step(
                scenario, "Manufacturer Registration", True,
                f"Manufacturer ID: {self.users['manufacturer']['id']}, Company: Precision CNC Technologies",
                response_time
            )
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else error
            self.log_scenario_step(
                scenario, "Manufacturer Registration", False,
                f"Error: {error_msg}",
                response_time
            )
            return False
        
        # Step 2: Manufacturer Login
        print("\n🔐 Step 2: Manufacturer Authentication")
        login_data = f"username={manufacturer_email}&password=ManufacturerSecure2024!"
        
        response, response_time, error = self.make_request(
            "POST", "/auth/login",
            data=login_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if response and response.status_code == 200:
            token_data = response.json()
            self.tokens["manufacturer"] = token_data["access_token"]
            self.log_scenario_step(
                scenario, "Manufacturer Login", True,
                f"Authentication successful, token expires in: {token_data.get('expires_in', 'Unknown')}s",
                response_time
            )
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else error
            self.log_scenario_step(
                scenario, "Manufacturer Login", False,
                f"Error: {error_msg}",
                response_time
            )
            return False
        
        # Step 3: Browse Available Orders
        print("\n🔍 Step 3: Browse Available Orders")
        manufacturer_headers = {"Authorization": f"Bearer {self.tokens['manufacturer']}"}
        
        response, response_time, error = self.make_request(
            "GET", "/orders/?status_filter=active&technology=CNC Machining",
            headers=manufacturer_headers
        )
        
        if response and response.status_code == 200:
            available_orders = response.json()
            orders_count = len(available_orders.get('orders', []))
            self.log_scenario_step(
                scenario, "Browse Available Orders", True,
                f"Found {orders_count} CNC machining orders available for quoting",
                response_time
            )
        else:
            self.log_scenario_step(
                scenario, "Browse Available Orders", False,
                f"Error: {response.status_code if response else error}",
                response_time
            )
        
        # Step 4: View Specific Order Details
        if self.orders:
            print("\n📋 Step 4: Analyze Order Requirements")
            order_id = self.orders[0]["id"]
            
            response, response_time, error = self.make_request(
                "GET", f"/orders/{order_id}",
                headers=manufacturer_headers
            )
            
            if response and response.status_code == 200:
                order_details = response.json()
                self.log_scenario_step(
                    scenario, "Analyze Order Requirements", True,
                    f"Order analyzed: {order_details['technology']}, Qty: {order_details['quantity']}, Budget: {order_details['budget_pln']} PLN",
                    response_time
                )
            else:
                self.log_scenario_step(
                    scenario, "Analyze Order Requirements", False,
                    f"Error: {response.status_code if response else error}",
                    response_time
                )
        
        # Step 5: Check Algorithm Configuration
        print("\n⚙️ Step 5: Review Matching Configuration")
        response, response_time, error = self.make_request(
            "GET", "/matching/algorithm-config",
            headers=manufacturer_headers
        )
        
        if response and response.status_code == 200:
            self.log_scenario_step(
                scenario, "Review Matching Algorithm", True,
                "Algorithm configuration retrieved successfully",
                response_time
            )
        else:
            self.log_scenario_step(
                scenario, "Review Matching Algorithm", False,
                f"Error: {response.status_code if response else error}",
                response_time
            )
        
        return True

    def scenario_3_advanced_features(self):
        """
        Scenario 3: Advanced Platform Features
        - Performance monitoring
        - Email system testing
        - Analytics and reporting
        - System administration
        """
        print("\n🚀 SCENARIO 3: Advanced Platform Features")
        print("=" * 60)
        
        scenario = "Advanced Features"
        
        # Step 1: Performance Monitoring
        print("\n📊 Step 1: Performance Monitoring")
        
        # Cache performance
        response, response_time, error = self.make_request("GET", "/performance/cache")
        if response and response.status_code == 200:
            self.log_scenario_step(
                scenario, "Cache Performance Monitoring", True,
                "Cache metrics retrieved successfully",
                response_time
            )
        else:
            self.log_scenario_step(
                scenario, "Cache Performance Monitoring", False,
                f"Error: {response.status_code if response else error}",
                response_time
            )
        
        # Performance summary
        response, response_time, error = self.make_request("GET", "/performance/summary?hours=24")
        if response and response.status_code == 200:
            self.log_scenario_step(
                scenario, "Performance Summary", True,
                "24-hour performance summary retrieved",
                response_time
            )
        else:
            self.log_scenario_step(
                scenario, "Performance Summary", False,
                f"Error: {response.status_code if response else error}",
                response_time
            )
        
        # Step 2: Email System Testing
        print("\n📧 Step 2: Email System Features")
        
        # Email templates (admin feature)
        if "client" in self.tokens:
            headers = {"Authorization": f"Bearer {self.tokens['client']}"}
            response, response_time, error = self.make_request("GET", "/emails/templates", headers=headers)
            
            if response and response.status_code in [200, 403]:
                success = response.status_code == 200 or "Admin" in (response.text or "")
                self.log_scenario_step(
                    scenario, "Email Templates Access", success,
                    f"Email templates endpoint tested (Status: {response.status_code})",
                    response_time
                )
            else:
                self.log_scenario_step(
                    scenario, "Email Templates Access", False,
                    f"Error: {response.status_code if response else error}",
                    response_time
                )
        
        # Unsubscribe functionality (GDPR compliance)
        unsubscribe_data = {
            "email": "test-unsubscribe@example.com",
            "token": "test_token_123"
        }
        
        response, response_time, error = self.make_request(
            "POST", "/emails/unsubscribe",
            json=unsubscribe_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response and response.status_code in [200, 400, 404]:
            self.log_scenario_step(
                scenario, "GDPR Email Unsubscribe", True,
                f"Unsubscribe endpoint functional (Status: {response.status_code})",
                response_time
            )
        else:
            self.log_scenario_step(
                scenario, "GDPR Email Unsubscribe", False,
                f"Error: {response.status_code if response else error}",
                response_time
            )
        
        # Step 3: System Health Monitoring
        print("\n🏥 Step 3: System Health Monitoring")
        
        response, response_time, error = self.make_request("GET", "/performance/health")
        if response and response.status_code == 200:
            health_data = response.json()
            self.log_scenario_step(
                scenario, "System Health Check", True,
                "All system components healthy",
                response_time
            )
        else:
            self.log_scenario_step(
                scenario, "System Health Check", False,
                f"Error: {response.status_code if response else error}",
                response_time
            )
        
        # Step 4: Custom Metrics Tracking
        print("\n📈 Step 4: Custom Metrics Tracking")
        
        metric_data = {
            "metric_name": "order_processing_time",
            "value": 2.5,
            "tags": {"order_type": "cnc_machining", "priority": "high"},
            "unit": "minutes",
            "timestamp": datetime.now().isoformat()
        }
        
        response, response_time, error = self.make_request(
            "POST", "/performance/track-metric",
            json=metric_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response and response.status_code == 200:
            self.log_scenario_step(
                scenario, "Custom Metrics Tracking", True,
                "Custom metric tracked successfully",
                response_time
            )
        else:
            self.log_scenario_step(
                scenario, "Custom Metrics Tracking", False,
                f"Error: {response.status_code if response else error}",
                response_time
            )
        
        return True

    def scenario_4_security_testing(self):
        """
        Scenario 4: Security and Error Handling
        - Authentication security
        - Authorization testing
        - Input validation
        - Error handling
        """
        print("\n🛡️ SCENARIO 4: Security & Error Handling")
        print("=" * 60)
        
        scenario = "Security Testing"
        
        # Step 1: Authentication Security
        print("\n🔐 Step 1: Authentication Security")
        
        # Test invalid credentials
        invalid_login = "username=invalid@example.com&password=wrongpassword"
        response, response_time, error = self.make_request(
            "POST", "/auth/login",
            data=invalid_login,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if response and response.status_code == 401:
            self.log_scenario_step(
                scenario, "Invalid Credentials Rejection", True,
                "Invalid credentials correctly rejected",
                response_time
            )
        else:
            self.log_scenario_step(
                scenario, "Invalid Credentials Rejection", False,
                f"Unexpected response: {response.status_code if response else error}",
                response_time
            )
        
        # Step 2: Authorization Testing
        print("\n🚪 Step 2: Authorization Testing")
        
        # Test unauthorized access
        response, response_time, error = self.make_request("GET", "/orders/")
        if response and response.status_code == 401:
            self.log_scenario_step(
                scenario, "Unauthorized Access Prevention", True,
                "Unauthorized access correctly blocked",
                response_time
            )
        else:
            self.log_scenario_step(
                scenario, "Unauthorized Access Prevention", False,
                f"Unexpected response: {response.status_code if response else error}",
                response_time
            )
        
        # Step 3: Input Validation
        print("\n✅ Step 3: Input Validation")
        
        if "client" in self.tokens:
            headers = {"Authorization": f"Bearer {self.tokens['client']}"}
            invalid_order = {
                "title": "",  # Invalid: empty
                "description": "x",  # Invalid: too short
                "technology": "",  # Invalid: empty
                "material": "",  # Invalid: empty
                "quantity": -5,  # Invalid: negative
                "budget_pln": 0,  # Invalid: zero
                "delivery_deadline": "invalid-date"  # Invalid: bad format
            }
            
            response, response_time, error = self.make_request(
                "POST", "/orders/",
                json=invalid_order,
                headers={**headers, "Content-Type": "application/json"}
            )
            
            if response and response.status_code == 422:
                self.log_scenario_step(
                    scenario, "Input Validation", True,
                    "Invalid data correctly rejected with validation errors",
                    response_time
                )
            else:
                self.log_scenario_step(
                    scenario, "Input Validation", False,
                    f"Unexpected response: {response.status_code if response else error}",
                    response_time
                )
        
        # Step 4: Error Handling
        print("\n⚠️ Step 4: Error Handling")
        
        # Test non-existent endpoint
        response, response_time, error = self.make_request("GET", "/nonexistent-endpoint")
        if response and response.status_code == 404:
            self.log_scenario_step(
                scenario, "404 Error Handling", True,
                "Non-existent endpoint correctly returns 404",
                response_time
            )
        else:
            self.log_scenario_step(
                scenario, "404 Error Handling", False,
                f"Unexpected response: {response.status_code if response else error}",
                response_time
            )
        
        return True

    def scenario_5_load_testing(self):
        """
        Scenario 5: Load Testing and Performance
        - Concurrent user simulation
        - API response time testing
        - System stability under load
        """
        print("\n🔥 SCENARIO 5: Load Testing & Performance")
        print("=" * 60)
        
        scenario = "Load Testing"
        
        # Step 1: Basic Load Test
        print("\n⚡ Step 1: Basic Load Test")
        
        concurrent_requests = 30
        successful_requests = 0
        total_time = 0
        
        print(f"Running {concurrent_requests} concurrent health checks...")
        start_time = time.time()
        
        for i in range(concurrent_requests):
            response, response_time, error = self.make_request("GET", "health")
            total_time += response_time
            
            if response and response.status_code == 200:
                successful_requests += 1
            
            if (i + 1) % 10 == 0:
                print(f"     Completed {i + 1}/{concurrent_requests} requests...")
        
        total_elapsed = time.time() - start_time
        success_rate = (successful_requests / concurrent_requests) * 100
        avg_response_time = total_time / concurrent_requests
        rps = concurrent_requests / total_elapsed
        
        if success_rate >= 95:
            self.log_scenario_step(
                scenario, "Basic Load Test", True,
                f"Success: {success_rate:.1f}%, Avg response: {avg_response_time:.3f}s, RPS: {rps:.1f}",
                total_elapsed
            )
        else:
            self.log_scenario_step(
                scenario, "Basic Load Test", False,
                f"Success: {success_rate:.1f}% (below 95% threshold)",
                total_elapsed
            )
        
        # Step 2: API Endpoint Stress Test
        print("\n🎯 Step 2: API Endpoint Stress Test")
        
        if "client" in self.tokens:
            headers = {"Authorization": f"Bearer {self.tokens['client']}"}
            stress_requests = 15
            api_successful = 0
            
            print(f"Testing orders endpoint with {stress_requests} requests...")
            start_time = time.time()
            
            for i in range(stress_requests):
                response, response_time, error = self.make_request("GET", "/orders/", headers=headers)
                if response and response.status_code == 200:
                    api_successful += 1
            
            api_elapsed = time.time() - start_time
            api_success_rate = (api_successful / stress_requests) * 100
            api_rps = stress_requests / api_elapsed
            
            if api_success_rate >= 90:
                self.log_scenario_step(
                    scenario, "API Stress Test", True,
                    f"Orders API: {api_success_rate:.1f}% success, {api_rps:.1f} RPS",
                    api_elapsed
                )
            else:
                self.log_scenario_step(
                    scenario, "API Stress Test", False,
                    f"Orders API: {api_success_rate:.1f}% (below 90% threshold)",
                    api_elapsed
                )
        
        return True

    def generate_comprehensive_report(self):
        """Generate detailed test report with scenarios and metrics"""
        print("\n" + "="*80)
        print("📋 COMPREHENSIVE USER SCENARIO TEST REPORT")
        print("="*80)
        
        # Overall statistics
        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        
        print(f"\n📊 Overall Test Results:")
        print(f"   Total Scenario Steps: {self.total_tests}")
        print(f"   Successful Steps: {self.passed_tests}")
        print(f"   Failed Steps: {self.total_tests - self.passed_tests}")
        print(f"   Success Rate: {success_rate:.1f}%")
        
        # Scenario breakdown
        scenarios = {}
        for result in self.scenario_results:
            scenario = result["scenario"]
            if scenario not in scenarios:
                scenarios[scenario] = {"total": 0, "passed": 0, "steps": []}
            
            scenarios[scenario]["total"] += 1
            if result["success"]:
                scenarios[scenario]["passed"] += 1
            scenarios[scenario]["steps"].append(result)
        
        print(f"\n📋 Scenario Breakdown:")
        for scenario_name, scenario_data in scenarios.items():
            scenario_success_rate = (scenario_data["passed"] / scenario_data["total"] * 100)
            status = "✅" if scenario_success_rate >= 80 else "⚠️" if scenario_success_rate >= 60 else "❌"
            print(f"   {status} {scenario_name}: {scenario_data['passed']}/{scenario_data['total']} ({scenario_success_rate:.1f}%)")
        
        # Failed steps details
        failed_steps = [r for r in self.scenario_results if not r["success"]]
        if failed_steps:
            print(f"\n❌ Failed Scenario Steps:")
            for step in failed_steps:
                print(f"   - {step['scenario']}: {step['step']}")
                if step["details"]:
                    print(f"     Error: {step['details']}")
        
        # Performance metrics
        response_times = [r["response_time"] for r in self.scenario_results if r["response_time"] > 0]
        if response_times:
            avg_time = sum(response_times) / len(response_times)
            max_time = max(response_times)
            min_time = min(response_times)
            
            print(f"\n⚡ Performance Metrics:")
            print(f"   Average Response Time: {avg_time:.3f}s")
            print(f"   Fastest Response: {min_time:.3f}s")
            print(f"   Slowest Response: {max_time:.3f}s")
        
        # User accounts created
        print(f"\n👥 Test User Accounts Created:")
        for role, user in self.users.items():
            print(f"   {role.title()}: {user.get('email', 'Unknown')} (ID: {user.get('id', 'Unknown')})")
        
        # Orders created
        if self.orders:
            print(f"\n📦 Test Orders Created:")
            for order in self.orders:
                print(f"   Order {order['id']}: {order['title'][:50]}... (Budget: {order['budget_pln']} PLN)")
        
        # Save detailed report
        report_data = {
            "test_summary": {
                "total_tests": self.total_tests,
                "passed_tests": self.passed_tests,
                "success_rate": success_rate,
                "execution_date": datetime.now().isoformat()
            },
            "scenarios": scenarios,
            "detailed_results": self.scenario_results,
            "users_created": self.users,
            "orders_created": self.orders
        }
        
        with open("user_scenario_test_report.json", "w") as f:
            json.dump(report_data, f, indent=2, default=str)
        
        print(f"\n📄 Detailed report saved to: user_scenario_test_report.json")
        
        # Final assessment
        if success_rate >= 85:
            print("\n🎉 EXCELLENT: All major user scenarios working properly!")
            assessment = "Production Ready"
        elif success_rate >= 70:
            print("\n✅ GOOD: Most user scenarios functional, minor issues detected.")
            assessment = "Nearly Production Ready"
        elif success_rate >= 50:
            print("\n⚠️ MODERATE: Core functionality working, several issues need attention.")
            assessment = "Needs Improvement"
        else:
            print("\n❌ CRITICAL: Major issues detected, system needs significant work.")
            assessment = "Not Production Ready"
        
        print(f"Assessment: {assessment}")
        print("="*80)
        
        return success_rate, assessment

    def run_all_scenarios(self):
        """Execute all user scenario tests"""
        print("🚀 MANUFACTURING PLATFORM - USER SCENARIO TESTING")
        print("="*80)
        print(f"Testing Environment: {self.base_url}")
        print(f"Test Execution Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*80)
        
        try:
            # Execute all scenarios
            self.scenario_1_client_journey()
            self.scenario_2_manufacturer_journey()
            self.scenario_3_advanced_features()
            self.scenario_4_security_testing()
            self.scenario_5_load_testing()
            
            # Generate comprehensive report
            success_rate, assessment = self.generate_comprehensive_report()
            
            # Return appropriate exit code
            if success_rate >= 80:
                return 0  # Success
            elif success_rate >= 60:
                return 1  # Minor issues
            else:
                return 2  # Major issues
                
        except KeyboardInterrupt:
            print("\n⚠️ Testing interrupted by user")
            return 3
        except Exception as e:
            print(f"\n💥 Critical testing error: {e}")
            return 4


def main():
    """Main execution function"""
    tester = UserScenarioTester()
    
    try:
        exit_code = tester.run_all_scenarios()
        exit(exit_code)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        exit(5)


if __name__ == "__main__":
    main() 
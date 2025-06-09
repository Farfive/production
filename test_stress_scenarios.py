#!/usr/bin/env python3
"""
🚀 STRESS TESTING SCENARIOS - MANUFACTURING PLATFORM
==================================================

High-load testing scenarios:
- Database stress testing
- Memory usage monitoring
- Connection pool limits
- Large data handling
- Bulk operations
- System resource monitoring
"""

import asyncio
import json
import time
import threading
import requests
import psutil
import os
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
import random
import string
import sys

# Configuration
BASE_URL = "http://localhost:8000"
STRESS_TEST_RESULTS = []

def log_stress_test(test_name, status, details="", duration=0, metrics=None):
    """Log stress test results with system metrics"""
    result = {
        "test": test_name,
        "status": status,
        "details": details,
        "duration": f"{duration:.3f}s",
        "timestamp": datetime.now().isoformat(),
        "metrics": metrics or {}
    }
    STRESS_TEST_RESULTS.append(result)
    status_emoji = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
    print(f"{status_emoji} {test_name}: {status} ({duration:.3f}s)")
    if details:
        print(f"   Details: {details}")
    if metrics:
        print(f"   Metrics: {metrics}")

def get_system_metrics():
    """Get current system metrics"""
    try:
        return {
            "cpu_percent": psutil.cpu_percent(interval=1),
            "memory_percent": psutil.virtual_memory().percent,
            "memory_available_mb": psutil.virtual_memory().available / (1024*1024),
            "disk_usage_percent": psutil.disk_usage('/').percent,
            "network_connections": len(psutil.net_connections())
        }
    except:
        return {}

def generate_large_order_data():
    """Generate large order data for stress testing"""
    return {
        "title": f"Large Order {random.randint(1000, 9999)}",
        "description": "A" * 5000,  # 5KB description
        "category": "electronics",
        "quantity": random.randint(1000, 10000),
        "budget": random.uniform(10000, 100000),
        "deadline": (datetime.now() + timedelta(days=30)).isoformat(),
        "requirements": {
            "materials": ["steel", "aluminum", "plastic"] * 100,  # Large array
            "specifications": {f"spec_{i}": f"value_{i}" for i in range(100)},  # Large dict
            "quality_standards": ["ISO9001", "ISO14001"] * 50,
            "delivery_locations": [f"Location {i}" for i in range(50)]
        },
        "attachments": [f"file_{i}.pdf" for i in range(20)],
        "notes": "B" * 2000  # 2KB notes
    }

class StressTestSuite:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.test_tokens = []
        
    def run_all_stress_tests(self):
        """Execute all stress test scenarios"""
        print("🚀 STARTING STRESS TEST SCENARIOS")
        print("=" * 50)
        
        # Get initial system metrics
        initial_metrics = get_system_metrics()
        print(f"📊 Initial System Metrics: {initial_metrics}")
        
        # Stress test categories
        stress_categories = [
            ("💥 High Volume Registration", self.test_mass_registration),
            ("🔄 Concurrent Login Storm", self.test_login_storm),
            ("📊 Large Data Processing", self.test_large_data_handling),
            ("🗄️ Database Stress Test", self.test_database_stress),
            ("🌐 API Rate Limiting", self.test_rate_limiting),
            ("💾 Memory Usage Test", self.test_memory_usage),
            ("⚡ Connection Pool Test", self.test_connection_limits),
            ("🎯 Sustained Load Test", self.test_sustained_load)
        ]
        
        for category_name, test_function in stress_categories:
            print(f"\n{category_name}")
            print("-" * 40)
            try:
                test_function()
                # Brief pause between stress tests
                time.sleep(2)
            except Exception as e:
                log_stress_test(f"{category_name} - CRITICAL ERROR", "FAIL", str(e))
        
        # Get final system metrics
        final_metrics = get_system_metrics()
        print(f"\n📊 Final System Metrics: {final_metrics}")
        
        self.generate_stress_report(initial_metrics, final_metrics)

    def test_mass_registration(self):
        """Test system with high volume of simultaneous registrations"""
        start_time = time.time()
        start_metrics = get_system_metrics()
        
        try:
            def register_user(index):
                email = f"stress_user_{index}_{int(time.time())}@example.com"
                response = requests.post(f"{self.base_url}/api/v1/auth/register", json={
                    "email": email,
                    "password": "StressTest123!",
                    "full_name": f"Stress Test User {index}",
                    "company_name": f"Stress Company {index}",
                    "role": "client" if index % 2 == 0 else "manufacturer",
                    "gdpr_consent": True
                }, timeout=30)
                return {
                    "success": response.status_code == 201,
                    "status_code": response.status_code,
                    "response_time": response.elapsed.total_seconds()
                }
            
            # Test with 100 concurrent registrations
            num_users = 100
            with ThreadPoolExecutor(max_workers=50) as executor:
                futures = [executor.submit(register_user, i) for i in range(num_users)]
                results = []
                for future in as_completed(futures, timeout=120):
                    try:
                        result = future.result()
                        results.append(result)
                    except Exception as e:
                        results.append({"success": False, "error": str(e)})
            
            end_metrics = get_system_metrics()
            duration = time.time() - start_time
            
            successful = len([r for r in results if r.get("success", False)])
            success_rate = (successful / num_users) * 100
            avg_response_time = sum([r.get("response_time", 0) for r in results if "response_time" in r]) / len(results)
            
            metrics = {
                "users_created": successful,
                "success_rate": f"{success_rate:.1f}%",
                "avg_response_time": f"{avg_response_time:.3f}s",
                "cpu_usage_change": end_metrics.get("cpu_percent", 0) - start_metrics.get("cpu_percent", 0),
                "memory_usage_change": end_metrics.get("memory_percent", 0) - start_metrics.get("memory_percent", 0)
            }
            
            if success_rate >= 80:
                log_stress_test("Mass Registration", "PASS", 
                              f"Created {successful}/{num_users} users", duration, metrics)
            elif success_rate >= 50:
                log_stress_test("Mass Registration", "WARN", 
                              f"Partial success: {successful}/{num_users} users", duration, metrics)
            else:
                log_stress_test("Mass Registration", "FAIL", 
                              f"Low success rate: {successful}/{num_users} users", duration, metrics)
                
        except Exception as e:
            log_stress_test("Mass Registration", "FAIL", str(e), time.time() - start_time)

    def test_login_storm(self):
        """Test system with rapid concurrent logins"""
        start_time = time.time()
        start_metrics = get_system_metrics()
        
        try:
            # First create test users
            test_users = []
            for i in range(20):
                email = f"login_storm_{i}_{int(time.time())}@example.com"
                response = requests.post(f"{self.base_url}/api/v1/auth/register", json={
                    "email": email,
                    "password": "LoginStorm123!",
                    "full_name": f"Login Storm User {i}",
                    "company_name": f"Storm Company {i}",
                    "role": "client",
                    "gdpr_consent": True
                })
                if response.status_code == 201:
                    test_users.append({"email": email, "password": "LoginStorm123!"})
            
            if len(test_users) < 10:
                log_stress_test("Login Storm Setup", "FAIL", "Failed to create enough test users")
                return
            
            def rapid_login(user_data):
                results = []
                for _ in range(10):  # Each user logs in 10 times rapidly
                    response = requests.post(f"{self.base_url}/api/v1/auth/login", json={
                        "email": user_data["email"],
                        "password": user_data["password"]
                    }, timeout=10)
                    results.append({
                        "success": response.status_code == 200,
                        "response_time": response.elapsed.total_seconds()
                    })
                    time.sleep(0.1)  # Brief pause between requests
                return results
            
            # Execute rapid logins
            with ThreadPoolExecutor(max_workers=20) as executor:
                futures = [executor.submit(rapid_login, user) for user in test_users]
                all_results = []
                for future in as_completed(futures, timeout=60):
                    try:
                        results = future.result()
                        all_results.extend(results)
                    except Exception as e:
                        all_results.append({"success": False, "error": str(e)})
            
            end_metrics = get_system_metrics()
            duration = time.time() - start_time
            
            successful_logins = len([r for r in all_results if r.get("success", False)])
            total_attempts = len(all_results)
            success_rate = (successful_logins / total_attempts) * 100
            avg_response_time = sum([r.get("response_time", 0) for r in all_results if "response_time" in r]) / len(all_results)
            
            metrics = {
                "total_login_attempts": total_attempts,
                "successful_logins": successful_logins,
                "success_rate": f"{success_rate:.1f}%",
                "avg_response_time": f"{avg_response_time:.3f}s",
                "cpu_usage_change": end_metrics.get("cpu_percent", 0) - start_metrics.get("cpu_percent", 0)
            }
            
            if success_rate >= 90:
                log_stress_test("Login Storm", "PASS", 
                              f"Handled {successful_logins}/{total_attempts} login attempts", duration, metrics)
            elif success_rate >= 70:
                log_stress_test("Login Storm", "WARN", 
                              f"Partial success: {successful_logins}/{total_attempts} logins", duration, metrics)
            else:
                log_stress_test("Login Storm", "FAIL", 
                              f"Poor performance: {successful_logins}/{total_attempts} logins", duration, metrics)
                
        except Exception as e:
            log_stress_test("Login Storm", "FAIL", str(e), time.time() - start_time)

    def test_large_data_handling(self):
        """Test system with large data payloads"""
        start_time = time.time()
        start_metrics = get_system_metrics()
        
        try:
            # Create a test user first
            test_email = f"large_data_user_{int(time.time())}@example.com"
            register_response = requests.post(f"{self.base_url}/api/v1/auth/register", json={
                "email": test_email,
                "password": "LargeData123!",
                "full_name": "Large Data Test User",
                "company_name": "Large Data Company",
                "role": "client",
                "gdpr_consent": True
            })
            
            if register_response.status_code != 201:
                log_stress_test("Large Data Setup", "FAIL", "Failed to create test user")
                return
            
            # Login to get token
            login_response = requests.post(f"{self.base_url}/api/v1/auth/login", json={
                "email": test_email,
                "password": "LargeData123!"
            })
            
            if login_response.status_code != 200:
                log_stress_test("Large Data Login", "FAIL", "Failed to login test user")
                return
            
            token = login_response.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
            
            # Test with increasingly large order data
            data_sizes = [1, 5, 10, 20]  # KB sizes
            results = []
            
            for size_kb in data_sizes:
                large_order = generate_large_order_data()
                # Adjust description size
                large_order["description"] = "X" * (size_kb * 1024)
                
                response = requests.post(
                    f"{self.base_url}/api/v1/orders/",
                    json=large_order,
                    headers=headers,
                    timeout=30
                )
                
                results.append({
                    "size_kb": size_kb,
                    "success": response.status_code == 201,
                    "status_code": response.status_code,
                    "response_time": response.elapsed.total_seconds()
                })
            
            end_metrics = get_system_metrics()
            duration = time.time() - start_time
            
            successful_uploads = len([r for r in results if r["success"]])
            max_successful_size = max([r["size_kb"] for r in results if r["success"]], default=0)
            avg_response_time = sum([r["response_time"] for r in results]) / len(results)
            
            metrics = {
                "successful_uploads": f"{successful_uploads}/{len(results)}",
                "max_successful_size_kb": max_successful_size,
                "avg_response_time": f"{avg_response_time:.3f}s",
                "memory_usage_change": end_metrics.get("memory_percent", 0) - start_metrics.get("memory_percent", 0)
            }
            
            if successful_uploads >= len(results) * 0.8:
                log_stress_test("Large Data Handling", "PASS", 
                              f"Handled data up to {max_successful_size}KB", duration, metrics)
            else:
                log_stress_test("Large Data Handling", "WARN", 
                              f"Limited to {max_successful_size}KB data", duration, metrics)
                
        except Exception as e:
            log_stress_test("Large Data Handling", "FAIL", str(e), time.time() - start_time)

    def test_database_stress(self):
        """Test database performance under stress"""
        start_time = time.time()
        start_metrics = get_system_metrics()
        
        try:
            # Create multiple users and orders rapidly
            def create_user_and_orders(index):
                email = f"db_stress_{index}_{int(time.time())}@example.com"
                
                # Register user
                register_response = requests.post(f"{self.base_url}/api/v1/auth/register", json={
                    "email": email,
                    "password": "DbStress123!",
                    "full_name": f"DB Stress User {index}",
                    "company_name": f"DB Stress Company {index}",
                    "role": "client",
                    "gdpr_consent": True
                }, timeout=20)
                
                if register_response.status_code != 201:
                    return {"user_created": False, "orders_created": 0}
                
                # Login
                login_response = requests.post(f"{self.base_url}/api/v1/auth/login", json={
                    "email": email,
                    "password": "DbStress123!"
                }, timeout=10)
                
                if login_response.status_code != 200:
                    return {"user_created": True, "orders_created": 0}
                
                token = login_response.json()["access_token"]
                headers = {"Authorization": f"Bearer {token}"}
                
                # Create multiple orders
                orders_created = 0
                for order_idx in range(5):
                    order_data = {
                        "title": f"DB Stress Order {index}-{order_idx}",
                        "description": f"Database stress test order {order_idx}",
                        "category": "electronics",
                        "quantity": random.randint(1, 100),
                        "budget": random.uniform(1000, 10000),
                        "deadline": (datetime.now() + timedelta(days=30)).isoformat()
                    }
                    
                    order_response = requests.post(
                        f"{self.base_url}/api/v1/orders/",
                        json=order_data,
                        headers=headers,
                        timeout=15
                    )
                    
                    if order_response.status_code == 201:
                        orders_created += 1
                
                return {"user_created": True, "orders_created": orders_created}
            
            # Execute database stress test
            num_concurrent = 30
            with ThreadPoolExecutor(max_workers=15) as executor:
                futures = [executor.submit(create_user_and_orders, i) for i in range(num_concurrent)]
                results = []
                for future in as_completed(futures, timeout=180):
                    try:
                        result = future.result()
                        results.append(result)
                    except Exception as e:
                        results.append({"user_created": False, "orders_created": 0, "error": str(e)})
            
            end_metrics = get_system_metrics()
            duration = time.time() - start_time
            
            users_created = len([r for r in results if r.get("user_created", False)])
            total_orders = sum([r.get("orders_created", 0) for r in results])
            
            metrics = {
                "users_created": f"{users_created}/{num_concurrent}",
                "orders_created": total_orders,
                "avg_orders_per_user": f"{total_orders/max(users_created, 1):.1f}",
                "database_operations": users_created + total_orders,
                "operations_per_second": f"{(users_created + total_orders)/duration:.1f}",
                "memory_usage_change": end_metrics.get("memory_percent", 0) - start_metrics.get("memory_percent", 0)
            }
            
            if users_created >= num_concurrent * 0.8 and total_orders >= num_concurrent * 3:
                log_stress_test("Database Stress", "PASS", 
                              f"Created {users_created} users and {total_orders} orders", duration, metrics)
            elif users_created >= num_concurrent * 0.5:
                log_stress_test("Database Stress", "WARN", 
                              f"Partial success: {users_created} users, {total_orders} orders", duration, metrics)
            else:
                log_stress_test("Database Stress", "FAIL", 
                              f"Poor performance: {users_created} users, {total_orders} orders", duration, metrics)
                
        except Exception as e:
            log_stress_test("Database Stress", "FAIL", str(e), time.time() - start_time)

    def test_rate_limiting(self):
        """Test API rate limiting behavior"""
        start_time = time.time()
        
        try:
            # Rapid fire requests to test rate limiting
            responses = []
            for i in range(100):
                response = requests.get(f"{self.base_url}/health", timeout=5)
                responses.append({
                    "status_code": response.status_code,
                    "response_time": response.elapsed.total_seconds()
                })
                if i % 10 == 0:
                    time.sleep(0.1)  # Brief pause every 10 requests
            
            duration = time.time() - start_time
            
            rate_limited = len([r for r in responses if r["status_code"] == 429])
            successful = len([r for r in responses if r["status_code"] == 200])
            avg_response_time = sum([r["response_time"] for r in responses]) / len(responses)
            
            metrics = {
                "total_requests": len(responses),
                "successful_requests": successful,
                "rate_limited_requests": rate_limited,
                "avg_response_time": f"{avg_response_time:.3f}s",
                "requests_per_second": f"{len(responses)/duration:.1f}"
            }
            
            if rate_limited > 0:
                log_stress_test("Rate Limiting", "PASS", 
                              f"Rate limiting active: {rate_limited} requests limited", duration, metrics)
            else:
                log_stress_test("Rate Limiting", "WARN", 
                              "No rate limiting detected", duration, metrics)
                
        except Exception as e:
            log_stress_test("Rate Limiting", "FAIL", str(e), time.time() - start_time)

    def test_memory_usage(self):
        """Monitor memory usage during operations"""
        start_time = time.time()
        start_metrics = get_system_metrics()
        
        try:
            # Perform memory-intensive operations
            memory_snapshots = []
            
            for i in range(20):
                # Create large registration data
                large_data = {
                    "email": f"memory_test_{i}_{int(time.time())}@example.com",
                    "password": "MemoryTest123!",
                    "full_name": "A" * 1000,  # 1KB name
                    "company_name": "B" * 1000,  # 1KB company
                    "role": "client",
                    "gdpr_consent": True
                }
                
                response = requests.post(f"{self.base_url}/api/v1/auth/register", json=large_data)
                
                # Take memory snapshot
                current_metrics = get_system_metrics()
                memory_snapshots.append(current_metrics.get("memory_percent", 0))
                
                time.sleep(0.5)
            
            end_metrics = get_system_metrics()
            duration = time.time() - start_time
            
            max_memory = max(memory_snapshots)
            min_memory = min(memory_snapshots)
            memory_growth = end_metrics.get("memory_percent", 0) - start_metrics.get("memory_percent", 0)
            
            metrics = {
                "initial_memory_percent": start_metrics.get("memory_percent", 0),
                "final_memory_percent": end_metrics.get("memory_percent", 0),
                "memory_growth_percent": memory_growth,
                "peak_memory_percent": max_memory,
                "memory_available_mb": end_metrics.get("memory_available_mb", 0)
            }
            
            if memory_growth < 10:  # Less than 10% memory growth
                log_stress_test("Memory Usage", "PASS", 
                              f"Memory growth: {memory_growth:.1f}%", duration, metrics)
            elif memory_growth < 20:
                log_stress_test("Memory Usage", "WARN", 
                              f"Moderate memory growth: {memory_growth:.1f}%", duration, metrics)
            else:
                log_stress_test("Memory Usage", "FAIL", 
                              f"High memory growth: {memory_growth:.1f}%", duration, metrics)
                
        except Exception as e:
            log_stress_test("Memory Usage", "FAIL", str(e), time.time() - start_time)

    def test_connection_limits(self):
        """Test connection pool and limits"""
        start_time = time.time()
        start_metrics = get_system_metrics()
        
        try:
            # Create many simultaneous connections
            def make_persistent_connection(index):
                session = requests.Session()
                results = []
                
                for i in range(10):
                    try:
                        response = session.get(f"{self.base_url}/health", timeout=10)
                        results.append({
                            "success": response.status_code == 200,
                            "connection_id": f"{index}-{i}"
                        })
                        time.sleep(0.1)
                    except Exception as e:
                        results.append({
                            "success": False,
                            "error": str(e),
                            "connection_id": f"{index}-{i}"
                        })
                
                session.close()
                return results
            
            # Test with many concurrent connections
            num_connections = 50
            with ThreadPoolExecutor(max_workers=num_connections) as executor:
                futures = [executor.submit(make_persistent_connection, i) for i in range(num_connections)]
                all_results = []
                for future in as_completed(futures, timeout=120):
                    try:
                        results = future.result()
                        all_results.extend(results)
                    except Exception as e:
                        all_results.append({"success": False, "error": str(e)})
            
            end_metrics = get_system_metrics()
            duration = time.time() - start_time
            
            successful_connections = len([r for r in all_results if r.get("success", False)])
            total_attempts = len(all_results)
            success_rate = (successful_connections / total_attempts) * 100
            
            metrics = {
                "total_connection_attempts": total_attempts,
                "successful_connections": successful_connections,
                "success_rate": f"{success_rate:.1f}%",
                "concurrent_connections": num_connections,
                "network_connections_change": end_metrics.get("network_connections", 0) - start_metrics.get("network_connections", 0)
            }
            
            if success_rate >= 95:
                log_stress_test("Connection Limits", "PASS", 
                              f"Handled {successful_connections}/{total_attempts} connections", duration, metrics)
            elif success_rate >= 80:
                log_stress_test("Connection Limits", "WARN", 
                              f"Some connection issues: {successful_connections}/{total_attempts}", duration, metrics)
            else:
                log_stress_test("Connection Limits", "FAIL", 
                              f"Connection problems: {successful_connections}/{total_attempts}", duration, metrics)
                
        except Exception as e:
            log_stress_test("Connection Limits", "FAIL", str(e), time.time() - start_time)

    def test_sustained_load(self):
        """Test system under sustained load"""
        start_time = time.time()
        start_metrics = get_system_metrics()
        
        try:
            print("   Running sustained load test for 60 seconds...")
            
            results = []
            end_time = start_time + 60  # Run for 60 seconds
            
            def sustained_requests():
                session = requests.Session()
                request_results = []
                
                while time.time() < end_time:
                    try:
                        response = session.get(f"{self.base_url}/health", timeout=5)
                        request_results.append({
                            "success": response.status_code == 200,
                            "response_time": response.elapsed.total_seconds(),
                            "timestamp": time.time()
                        })
                        time.sleep(0.1)  # 10 requests per second per thread
                    except Exception as e:
                        request_results.append({
                            "success": False,
                            "error": str(e),
                            "timestamp": time.time()
                        })
                
                session.close()
                return request_results
            
            # Run sustained load with multiple threads
            num_threads = 10
            with ThreadPoolExecutor(max_workers=num_threads) as executor:
                futures = [executor.submit(sustained_requests) for _ in range(num_threads)]
                for future in as_completed(futures):
                    try:
                        thread_results = future.result()
                        results.extend(thread_results)
                    except Exception as e:
                        results.append({"success": False, "error": str(e)})
            
            end_metrics = get_system_metrics()
            duration = time.time() - start_time
            
            successful_requests = len([r for r in results if r.get("success", False)])
            total_requests = len(results)
            success_rate = (successful_requests / total_requests) * 100 if total_requests > 0 else 0
            avg_response_time = sum([r.get("response_time", 0) for r in results if "response_time" in r]) / max(successful_requests, 1)
            requests_per_second = total_requests / duration
            
            metrics = {
                "duration_seconds": f"{duration:.1f}",
                "total_requests": total_requests,
                "successful_requests": successful_requests,
                "success_rate": f"{success_rate:.1f}%",
                "requests_per_second": f"{requests_per_second:.1f}",
                "avg_response_time": f"{avg_response_time:.3f}s",
                "cpu_usage_change": end_metrics.get("cpu_percent", 0) - start_metrics.get("cpu_percent", 0),
                "memory_usage_change": end_metrics.get("memory_percent", 0) - start_metrics.get("memory_percent", 0)
            }
            
            if success_rate >= 95 and avg_response_time < 0.5:
                log_stress_test("Sustained Load", "PASS", 
                              f"Handled {requests_per_second:.1f} req/s for {duration:.1f}s", duration, metrics)
            elif success_rate >= 80:
                log_stress_test("Sustained Load", "WARN", 
                              f"Moderate performance under sustained load", duration, metrics)
            else:
                log_stress_test("Sustained Load", "FAIL", 
                              f"Poor performance under sustained load", duration, metrics)
                
        except Exception as e:
            log_stress_test("Sustained Load", "FAIL", str(e), time.time() - start_time)

    def generate_stress_report(self, initial_metrics, final_metrics):
        """Generate comprehensive stress test report"""
        print("\n" + "="*60)
        print("🚀 STRESS TEST RESULTS SUMMARY")
        print("="*60)
        
        total_tests = len(STRESS_TEST_RESULTS)
        passed_tests = len([r for r in STRESS_TEST_RESULTS if r["status"] == "PASS"])
        failed_tests = len([r for r in STRESS_TEST_RESULTS if r["status"] == "FAIL"])
        warning_tests = len([r for r in STRESS_TEST_RESULTS if r["status"] == "WARN"])
        
        print(f"Total Stress Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"⚠️  Warnings: {warning_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        print(f"\n📊 System Resource Changes:")
        print(f"CPU Usage: {initial_metrics.get('cpu_percent', 0):.1f}% → {final_metrics.get('cpu_percent', 0):.1f}%")
        print(f"Memory Usage: {initial_metrics.get('memory_percent', 0):.1f}% → {final_metrics.get('memory_percent', 0):.1f}%")
        print(f"Available Memory: {initial_metrics.get('memory_available_mb', 0):.0f}MB → {final_metrics.get('memory_available_mb', 0):.0f}MB")
        
        # Save detailed report
        with open("STRESS_TEST_RESULTS.md", "w") as f:
            f.write("# 🚀 STRESS TEST RESULTS - MANUFACTURING PLATFORM\n\n")
            f.write(f"**Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"**Total Tests:** {total_tests}\n")
            f.write(f"**Success Rate:** {(passed_tests/total_tests)*100:.1f}%\n\n")
            
            f.write("## 📊 Test Summary\n\n")
            f.write(f"- ✅ **Passed:** {passed_tests}\n")
            f.write(f"- ❌ **Failed:** {failed_tests}\n")
            f.write(f"- ⚠️ **Warnings:** {warning_tests}\n\n")
            
            f.write("## 🖥️ System Resource Impact\n\n")
            f.write(f"- **Initial CPU Usage:** {initial_metrics.get('cpu_percent', 0):.1f}%\n")
            f.write(f"- **Final CPU Usage:** {final_metrics.get('cpu_percent', 0):.1f}%\n")
            f.write(f"- **Initial Memory Usage:** {initial_metrics.get('memory_percent', 0):.1f}%\n")
            f.write(f"- **Final Memory Usage:** {final_metrics.get('memory_percent', 0):.1f}%\n")
            f.write(f"- **Memory Available:** {final_metrics.get('memory_available_mb', 0):.0f}MB\n\n")
            
            f.write("## 📋 Detailed Results\n\n")
            for result in STRESS_TEST_RESULTS:
                status_emoji = "✅" if result["status"] == "PASS" else "❌" if result["status"] == "FAIL" else "⚠️"
                f.write(f"### {status_emoji} {result['test']}\n")
                f.write(f"- **Status:** {result['status']}\n")
                f.write(f"- **Duration:** {result['duration']}\n")
                f.write(f"- **Timestamp:** {result['timestamp']}\n")
                if result['details']:
                    f.write(f"- **Details:** {result['details']}\n")
                if result['metrics']:
                    f.write(f"- **Metrics:**\n")
                    for key, value in result['metrics'].items():
                        f.write(f"  - {key}: {value}\n")
                f.write("\n")
        
        print(f"\n📄 Detailed stress test report saved to: STRESS_TEST_RESULTS.md")

def main():
    """Main stress test execution"""
    print("🚀 MANUFACTURING PLATFORM - STRESS TESTING SUITE")
    print("=" * 60)
    
    # Check if psutil is available
    try:
        import psutil
    except ImportError:
        print("⚠️  psutil not installed - system metrics will be limited")
        print("Install with: pip install psutil")
    
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
    
    print("✅ Server is running - Starting stress tests...")
    print("⚠️  Warning: These tests will put significant load on the system")
    print("   Make sure you have sufficient system resources available\n")
    
    # Run all stress tests
    stress_suite = StressTestSuite()
    stress_suite.run_all_stress_tests()

if __name__ == "__main__":
    main() 
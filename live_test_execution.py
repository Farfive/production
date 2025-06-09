#!/usr/bin/env python3
"""
Live Manufacturing Platform Test Execution
Testing actual platform functionality with server running on localhost:8000
"""

import json
import urllib.request
import urllib.error
import time
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"

def test_request(method, endpoint, data=None, token=None):
    """Execute HTTP request and return results"""
    try:
        url = f"{BASE_URL}{endpoint}"
        
        if data:
            data_json = json.dumps(data).encode('utf-8')
        else:
            data_json = None
            
        req = urllib.request.Request(url, data=data_json, method=method)
        req.add_header('Content-Type', 'application/json')
        
        if token:
            req.add_header('Authorization', f'Bearer {token}')
            
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            return True, result, None
            
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        try:
            error_data = json.loads(error_body)
            return False, error_data, f"HTTP {e.code}: {error_data.get('detail', 'Unknown error')}"
        except:
            return False, None, f"HTTP {e.code}: {error_body}"
    except Exception as e:
        return False, None, f"Request error: {str(e)}"

def log_test(step, success, details="", data=None):
    """Log test results"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"[{timestamp}] {status} {step}")
    if details:
        print(f"    {details}")
    if data and success:
        print(f"    Data: {json.dumps(data, indent=2)[:200]}...")

# ===== LIVE TEST EXECUTION =====
print("🏭 MANUFACTURING PLATFORM - LIVE TEST EXECUTION")
print("=" * 70)
print("Testing real platform functionality with active server")
print("=" * 70)

test_results = []

# Test 1: Server Connectivity
print("\n🔌 TESTING SERVER CONNECTIVITY")
success, result, error = test_request("GET", "/health")
if success:
    log_test("Server Connectivity", True, "Platform is accessible and responding")
    test_results.append({"test": "Server Connectivity", "success": True})
else:
    log_test("Server Connectivity", False, f"Server not accessible: {error}")
    test_results.append({"test": "Server Connectivity", "success": False})
    print("❌ Cannot proceed without server access")
    exit(1)

# Test 2: Client Registration
print("\n👤 TESTING CLIENT REGISTRATION")
client_data = {
    "email": f"test_client_{int(time.time())}@livetest.com",
    "password": "SecureTestPass123!",
    "role": "client",
    "first_name": "Live",
    "last_name": "TestClient",
    "phone": "+1-555-LIVE-TEST",
    "company_name": "Live Test Manufacturing Co",
    "gdpr_consent": True,
    "marketing_consent": True,
    "data_processing_consent": True
}

success, result, error = test_request("POST", "/api/v1/auth/register", client_data)
if success:
    client_id = result.get('id')
    log_test("Client Registration", True, f"Client registered successfully - ID: {client_id}")
    test_results.append({"test": "Client Registration", "success": True})
else:
    log_test("Client Registration", False, f"Registration failed: {error}")
    test_results.append({"test": "Client Registration", "success": False})

# Test 3: Client Authentication
print("\n🔐 TESTING CLIENT AUTHENTICATION")
login_data = {
    "email": client_data["email"],
    "password": client_data["password"]
}

success, result, error = test_request("POST", "/api/v1/auth/login-json", login_data)
if success:
    client_token = result.get("access_token")
    log_test("Client Authentication", True, "Login successful - JWT token received")
    test_results.append({"test": "Client Authentication", "success": True})
else:
    log_test("Client Authentication", False, f"Login failed: {error}")
    test_results.append({"test": "Client Authentication", "success": False})
    client_token = None

# Test 4: Order Creation
print("\n📋 TESTING ORDER CREATION")
if client_token:
    order_data = {
        "title": "Live Test - Precision Manufacturing Order",
        "description": "Real-time test of 500 custom aluminum components with strict tolerances",
        "category": "metal_fabrication",
        "quantity": 500,
        "budget_min": 20000.00,
        "budget_max": 35000.00,
        "deadline": (datetime.now() + timedelta(days=45)).isoformat(),
        "specifications": {
            "material": "6061-T6 Aluminum",
            "finish": "Hard Anodized",
            "tolerances": "±0.05mm critical dimensions",
            "quality_standards": ["ISO 9001"]
        },
        "location": {
            "address": "123 Live Test Industrial Blvd",
            "city": "Test City",
            "state": "TX",
            "zip_code": "12345",
            "country": "USA"
        }
    }
    
    success, result, error = test_request("POST", "/api/v1/orders/", order_data, client_token)
    if success:
        order_id = result.get('id')
        log_test("Order Creation", True, f"Order created successfully - ID: {order_id}")
        test_results.append({"test": "Order Creation", "success": True})
    else:
        log_test("Order Creation", False, f"Order creation failed: {error}")
        test_results.append({"test": "Order Creation", "success": False})
        order_id = None
else:
    log_test("Order Creation", False, "Skipped due to authentication failure")
    test_results.append({"test": "Order Creation", "success": False})
    order_id = None

# Test 5: Producer Registration & Quote Submission
print("\n🏭 TESTING PRODUCER FUNCTIONALITY")
if order_id:
    producer_data = {
        "email": f"test_producer_{int(time.time())}@livetest.com",
        "password": "ProducerTestPass123!",
        "role": "producer",
        "first_name": "Live",
        "last_name": "TestProducer",
        "phone": "+1-555-PROD-TEST",
        "company_name": "Live Test Precision Manufacturing",
        "gdpr_consent": True,
        "marketing_consent": True,
        "data_processing_consent": True
    }
    
    # Register producer
    success, result, error = test_request("POST", "/api/v1/auth/register", producer_data)
    if success:
        log_test("Producer Registration", True, f"Producer registered - ID: {result.get('id')}")
        
        # Login producer
        producer_login = {
            "email": producer_data["email"],
            "password": producer_data["password"]
        }
        
        success, result, error = test_request("POST", "/api/v1/auth/login-json", producer_login)
        if success:
            producer_token = result.get("access_token")
            log_test("Producer Authentication", True, "Producer login successful")
            
            # Submit quote
            quote_data = {
                "order_id": order_id,
                "price": 28500.00,
                "delivery_time": 35,
                "message": "Live test quote - High-quality precision manufacturing with fast turnaround",
                "specifications": {
                    "manufacturing_process": "5-axis CNC machining",
                    "quality_certifications": ["ISO 9001", "AS9100"],
                    "material_source": "Certified aerospace-grade aluminum"
                }
            }
            
            success, result, error = test_request("POST", "/api/v1/quotes/", quote_data, producer_token)
            if success:
                quote_id = result.get('id')
                log_test("Quote Submission", True, f"Quote submitted - ID: {quote_id}, Price: ${quote_data['price']:,.2f}")
                test_results.append({"test": "Producer Functionality", "success": True})
            else:
                log_test("Quote Submission", False, f"Quote submission failed: {error}")
                test_results.append({"test": "Producer Functionality", "success": False})
        else:
            log_test("Producer Authentication", False, f"Producer login failed: {error}")
            test_results.append({"test": "Producer Functionality", "success": False})
    else:
        log_test("Producer Registration", False, f"Producer registration failed: {error}")
        test_results.append({"test": "Producer Functionality", "success": False})
else:
    log_test("Producer Functionality", False, "Skipped due to order creation failure")
    test_results.append({"test": "Producer Functionality", "success": False})

# Test 6: Order History & Analytics
print("\n📊 TESTING PLATFORM ANALYTICS")
if client_token:
    success, result, error = test_request("GET", "/api/v1/orders/", token=client_token)
    if success:
        orders = result.get("items", [])
        log_test("Order History", True, f"Retrieved {len(orders)} orders from client history")
        test_results.append({"test": "Platform Analytics", "success": True})
    else:
        log_test("Order History", False, f"Failed to retrieve order history: {error}")
        test_results.append({"test": "Platform Analytics", "success": False})
else:
    log_test("Platform Analytics", False, "Skipped due to authentication failure")
    test_results.append({"test": "Platform Analytics", "success": False})

# ===== FINAL RESULTS =====
print("\n" + "=" * 70)
print("LIVE TEST EXECUTION RESULTS")
print("=" * 70)

total_tests = len(test_results)
passed_tests = len([t for t in test_results if t["success"]])
failed_tests = total_tests - passed_tests
success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0

print(f"\n📊 TEST SUMMARY:")
print(f"Total Tests: {total_tests}")
print(f"✅ Passed: {passed_tests}")
print(f"❌ Failed: {failed_tests}")
print(f"Success Rate: {success_rate:.1f}%")

print(f"\n🎯 FUNCTIONALITY TESTED:")
for test_result in test_results:
    status = "✅" if test_result["success"] else "❌"
    print(f"{status} {test_result['test']}")

print(f"\n🏆 OVERALL ASSESSMENT:")
if success_rate >= 90:
    grade = "A+ EXCELLENT"
    status = "PRODUCTION READY"
elif success_rate >= 80:
    grade = "A- VERY GOOD"
    status = "READY WITH OPTIMIZATIONS"
elif success_rate >= 70:
    grade = "B+ GOOD"
    status = "FUNCTIONAL"
else:
    grade = "NEEDS IMPROVEMENT"
    status = "REQUIRES WORK"

print(f"Grade: {grade}")
print(f"Status: {status}")

if success_rate >= 85:
    print(f"\n🎉 SUCCESS: Manufacturing Platform is LIVE and OPERATIONAL!")
    print("Real-time testing confirms production readiness!")
else:
    print(f"\n⚠️ Review needed: Some functionality requires attention.")

print(f"\n✨ Live test execution completed at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 70) 
#!/usr/bin/env python3
"""
Final Comprehensive Manufacturing Platform Test Suite
Matches actual API schema and provides detailed validation
"""

import json
import time
from datetime import datetime, timedelta
from urllib.request import urlopen, Request, HTTPError
from urllib.parse import urlencode

BASE_URL = "http://localhost:8000"

def format_datetime(dt):
    """Format datetime for API"""
    return dt.isoformat()

def test_server_basic():
    """Test basic server functionality"""
    print("🏥 BASIC SERVER TESTS")
    print("=" * 40)
    
    tests = []
    
    # Test 1: Root endpoint
    try:
        response = urlopen(f"{BASE_URL}/", timeout=10)
        data = json.loads(response.read().decode())
        tests.append(("Root Endpoint", True, f"Status: {response.code}"))
        print(f"✅ Root Endpoint: {data.get('message', 'OK')}")
    except Exception as e:
        tests.append(("Root Endpoint", False, str(e)))
        print(f"❌ Root Endpoint: {e}")
    
    # Test 2: Health check
    try:
        response = urlopen(f"{BASE_URL}/health", timeout=10)
        data = json.loads(response.read().decode())
        tests.append(("Health Check", True, f"Status: {data.get('status')}"))
        print(f"✅ Health Check: {data.get('status', 'OK')}")
    except Exception as e:
        tests.append(("Health Check", False, str(e)))
        print(f"❌ Health Check: {e}")
    
    # Test 3: API documentation
    try:
        response = urlopen(f"{BASE_URL}/docs", timeout=10)
        tests.append(("API Docs", True, f"Status: {response.code}"))
        print(f"✅ API Documentation accessible")
    except Exception as e:
        tests.append(("API Docs", False, str(e)))
        print(f"❌ API Documentation: {e}")
    
    return tests

def test_user_registration():
    """Test user registration with proper schema"""
    print("\n👤 USER REGISTRATION TESTS")
    print("=" * 40)
    
    tests = []
    
    # Test valid client registration
    client_data = {
        'email': 'test_client@manufacturing.com',
        'password': 'SecurePassword123!',
        'first_name': 'Test',
        'last_name': 'Client',
        'role': 'client',
        'data_processing_consent': True,
        'company_name': 'Test Manufacturing Co.',
        'phone': '+48123456789'
    }
    
    try:
        data = json.dumps(client_data).encode('utf-8')
        request = Request(
            f"{BASE_URL}/api/v1/auth/register",
            data=data,
            headers={'Content-Type': 'application/json'}
        )
        response = urlopen(request, timeout=10)
        result = json.loads(response.read().decode())
        
        tests.append(("Client Registration", True, f"User ID: {result.get('id')}"))
        print(f"✅ Client Registration: {result.get('email')}")
        
    except HTTPError as e:
        error_data = json.loads(e.read().decode())
        if "already registered" in error_data.get('detail', ''):
            tests.append(("Client Registration", True, "User already exists"))
            print(f"✅ Client Registration: User already exists (expected)")
        else:
            tests.append(("Client Registration", False, error_data.get('detail')))
            print(f"❌ Client Registration: {error_data.get('detail')}")
    except Exception as e:
        tests.append(("Client Registration", False, str(e)))
        print(f"❌ Client Registration: {e}")
    
    # Test invalid registration (missing required fields)
    invalid_data = {
        'email': 'invalid@test.com',
        'password': '123',  # Too short
        'first_name': '',   # Empty
        'role': 'client'
        # Missing data_processing_consent
    }
    
    try:
        data = json.dumps(invalid_data).encode('utf-8')
        request = Request(
            f"{BASE_URL}/api/v1/auth/register",
            data=data,
            headers={'Content-Type': 'application/json'}
        )
        response = urlopen(request, timeout=10)
        tests.append(("Invalid Registration Prevention", False, "Should have failed"))
        print(f"❌ Invalid Registration: Should have been rejected")
        
    except HTTPError as e:
        if e.code == 422:
            tests.append(("Invalid Registration Prevention", True, "Validation working"))
            print(f"✅ Invalid Registration Prevention: Validation errors caught")
        else:
            tests.append(("Invalid Registration Prevention", False, f"Wrong error code: {e.code}"))
            print(f"❌ Invalid Registration Prevention: Wrong error code {e.code}")
    except Exception as e:
        tests.append(("Invalid Registration Prevention", False, str(e)))
        print(f"❌ Invalid Registration Prevention: {e}")
    
    return tests

def test_authentication():
    """Test authentication system"""
    print("\n🔐 AUTHENTICATION TESTS")
    print("=" * 40)
    
    tests = []
    auth_token = None
    
    # Test JSON login
    login_data = {
        'email': 'test_client@manufacturing.com',
        'password': 'SecurePassword123!'
    }
    
    try:
        data = json.dumps(login_data).encode('utf-8')
        request = Request(
            f"{BASE_URL}/api/v1/auth/login-json",
            data=data,
            headers={'Content-Type': 'application/json'}
        )
        response = urlopen(request, timeout=10)
        result = json.loads(response.read().decode())
        
        auth_token = result.get('access_token')
        tests.append(("JSON Login", True, f"Token received: {bool(auth_token)}"))
        print(f"✅ JSON Login: Token type {result.get('token_type')}")
        
    except HTTPError as e:
        error_data = json.loads(e.read().decode())
        tests.append(("JSON Login", False, error_data.get('detail')))
        print(f"❌ JSON Login: {error_data.get('detail')}")
    except Exception as e:
        tests.append(("JSON Login", False, str(e)))
        print(f"❌ JSON Login: {e}")
    
    # Test protected endpoint access
    if auth_token:
        try:
            request = Request(
                f"{BASE_URL}/api/v1/auth/me",
                headers={'Authorization': f'Bearer {auth_token}'}
            )
            response = urlopen(request, timeout=10)
            result = json.loads(response.read().decode())
            
            tests.append(("Protected Endpoint", True, f"User: {result.get('email')}"))
            print(f"✅ Protected Endpoint: {result.get('email')}")
            
        except Exception as e:
            tests.append(("Protected Endpoint", False, str(e)))
            print(f"❌ Protected Endpoint: {e}")
    else:
        tests.append(("Protected Endpoint", False, "No auth token"))
        print(f"❌ Protected Endpoint: No auth token available")
    
    # Test invalid credentials
    bad_login = {
        'email': 'test_client@manufacturing.com',
        'password': 'WrongPassword'
    }
    
    try:
        data = json.dumps(bad_login).encode('utf-8')
        request = Request(
            f"{BASE_URL}/api/v1/auth/login-json",
            data=data,
            headers={'Content-Type': 'application/json'}
        )
        response = urlopen(request, timeout=10)
        tests.append(("Invalid Credentials Prevention", False, "Should have failed"))
        print(f"❌ Invalid Credentials: Should have been rejected")
        
    except HTTPError as e:
        if e.code == 401:
            tests.append(("Invalid Credentials Prevention", True, "Unauthorized properly"))
            print(f"✅ Invalid Credentials Prevention: Properly rejected")
        else:
            tests.append(("Invalid Credentials Prevention", False, f"Wrong code: {e.code}"))
            print(f"❌ Invalid Credentials Prevention: Wrong error code {e.code}")
    except Exception as e:
        tests.append(("Invalid Credentials Prevention", False, str(e)))
        print(f"❌ Invalid Credentials Prevention: {e}")
    
    return tests, auth_token

def test_order_management(auth_token):
    """Test order management functionality"""
    print("\n📋 ORDER MANAGEMENT TESTS")
    print("=" * 40)
    
    tests = []
    
    if not auth_token:
        tests.append(("Order Management", False, "No auth token"))
        print(f"❌ Order Management: No authentication token")
        return tests
    
    # Test order listing
    try:
        request = Request(
            f"{BASE_URL}/api/v1/orders/",
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        response = urlopen(request, timeout=10)
        result = json.loads(response.read().decode())
        
        tests.append(("Order Listing", True, f"Total: {result.get('total', 0)}"))
        print(f"✅ Order Listing: {result.get('total', 0)} orders found")
        
    except HTTPError as e:
        error_data = json.loads(e.read().decode())
        tests.append(("Order Listing", False, error_data.get('detail')))
        print(f"❌ Order Listing: {error_data.get('detail')}")
    except Exception as e:
        tests.append(("Order Listing", False, str(e)))
        print(f"❌ Order Listing: {e}")
    
    # Test order creation with proper schema
    future_date = datetime.now() + timedelta(days=30)
    order_data = {
        'title': 'Test Manufacturing Order',
        'description': 'Comprehensive test order for platform validation and functionality testing',
        'technology': 'CNC Machining',
        'material': 'Aluminum 6061',
        'quantity': 100,
        'budget_pln': 5000.00,
        'delivery_deadline': format_datetime(future_date),
        'priority': 'normal',
        'preferred_location': 'Poland',
        'specifications': {
            'tolerance': '±0.1mm',
            'finish': 'Anodized',
            'hardness': 'T6'
        }
    }
    
    try:
        data = json.dumps(order_data).encode('utf-8')
        request = Request(
            f"{BASE_URL}/api/v1/orders/",
            data=data,
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {auth_token}'
            }
        )
        request.get_method = lambda: 'POST'
        response = urlopen(request, timeout=10)
        result = json.loads(response.read().decode())
        
        order_id = result.get('id')
        tests.append(("Order Creation", True, f"Order ID: {order_id}"))
        print(f"✅ Order Creation: Order #{order_id} created")
        
        # Test order retrieval
        if order_id:
            try:
                request = Request(
                    f"{BASE_URL}/api/v1/orders/{order_id}",
                    headers={'Authorization': f'Bearer {auth_token}'}
                )
                response = urlopen(request, timeout=10)
                result = json.loads(response.read().decode())
                
                tests.append(("Order Retrieval", True, f"Title: {result.get('title')}"))
                print(f"✅ Order Retrieval: {result.get('title')}")
                
            except Exception as e:
                tests.append(("Order Retrieval", False, str(e)))
                print(f"❌ Order Retrieval: {e}")
        
    except HTTPError as e:
        error_data = json.loads(e.read().decode())
        tests.append(("Order Creation", False, error_data.get('detail')))
        print(f"❌ Order Creation: {error_data.get('detail')}")
    except Exception as e:
        tests.append(("Order Creation", False, str(e)))
        print(f"❌ Order Creation: {e}")
    
    return tests

def run_comprehensive_test():
    """Run comprehensive platform test"""
    print("🧪 MANUFACTURING PLATFORM COMPREHENSIVE TEST")
    print("=" * 60)
    print(f"Target: {BASE_URL}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    all_tests = []
    
    # Run test suites
    basic_tests = test_server_basic()
    all_tests.extend(basic_tests)
    
    registration_tests = test_user_registration()
    all_tests.extend(registration_tests)
    
    auth_tests, auth_token = test_authentication()
    all_tests.extend(auth_tests)
    
    order_tests = test_order_management(auth_token)
    all_tests.extend(order_tests)
    
    # Generate summary
    print("\n" + "=" * 60)
    print("📊 COMPREHENSIVE TEST RESULTS")
    print("=" * 60)
    
    passed = sum(1 for _, success, _ in all_tests if success)
    total = len(all_tests)
    success_rate = (passed / total * 100) if total > 0 else 0
    
    print(f"\n🎯 SUMMARY:")
    print(f"   Tests Passed: {passed}/{total}")
    print(f"   Success Rate: {success_rate:.1f}%")
    
    if success_rate >= 90:
        print(f"   🎉 EXCELLENT - Platform fully operational!")
    elif success_rate >= 70:
        print(f"   ✅ GOOD - Platform functional with minor issues")
    elif success_rate >= 50:
        print(f"   ⚠️ FAIR - Platform needs improvement")
    else:
        print(f"   ❌ POOR - Platform requires significant fixes")
    
    print(f"\n📋 DETAILED RESULTS:")
    for test_name, success, details in all_tests:
        status = "✅" if success else "❌"
        print(f"   {status} {test_name}: {details}")
    
    # Platform readiness assessment
    critical_tests = ["Root Endpoint", "Health Check", "JSON Login", "Order Listing"]
    critical_passed = sum(1 for name, success, _ in all_tests 
                         if name in critical_tests and success)
    
    print(f"\n🚀 PLATFORM READINESS:")
    print(f"   Critical Features: {critical_passed}/{len(critical_tests)} working")
    
    if critical_passed == len(critical_tests):
        print(f"   ✅ Platform ready for production use")
    else:
        print(f"   ⚠️ Platform needs fixes before production")
    
    print(f"\n💡 NEXT STEPS:")
    failed_tests = [name for name, success, _ in all_tests if not success]
    if not failed_tests:
        print(f"   • Platform is fully functional")
        print(f"   • Ready for advanced feature development")
        print(f"   • Consider stress testing and performance optimization")
    else:
        print(f"   • Fix failing tests: {', '.join(failed_tests[:3])}")
        print(f"   • Review error logs and server configuration")
        print(f"   • Re-run tests after fixes")

if __name__ == "__main__":
    run_comprehensive_test() 
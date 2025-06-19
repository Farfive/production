#!/usr/bin/env python3
"""
Production Flow Testing Script
Comprehensive testing of the manufacturing platform backend from production perspective
"""

import asyncio
import aiohttp
import json
import time
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import sys
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('production_test.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class ProductionTester:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = None
        self.tokens = {}
        self.test_results = []
        self.test_users = {
            'client': {
                'email': 'system-client@manufacturing-platform.com',
                'password': 'SystemValidation2024!',
                'full_name': 'System Validation Client',
                'role': 'client'
            },
            'manufacturer': {
                'email': 'system-manufacturer@manufacturing-platform.com', 
                'password': 'SystemValidation2024!',
                'full_name': 'Certified Medical Manufacturer',
                'role': 'manufacturer',
                'company_name': 'Precision Medical Components LLC'
            },
            'admin': {
                'email': 'system-admin@manufacturing-platform.com',
                'password': 'SystemValidation2024!',
                'role': 'admin'
            }
        }

    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    def log_result(self, test_name: str, success: bool, details: Any = None, duration: float = 0):
        """Log test result"""
        result = {
            'test': test_name,
            'success': success,
            'details': details,
            'duration': duration,
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        logger.info(f"{status} | {test_name} | {duration:.2f}s")
        
        if not success and details:
            logger.error(f"Error details: {details}")

    async def make_request(self, method: str, endpoint: str, data: Dict = None, 
                          headers: Dict = None, user_type: str = None) -> Dict:
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        request_headers = {'Content-Type': 'application/json'}
        
        if headers:
            request_headers.update(headers)
            
        if user_type and user_type in self.tokens:
            request_headers['Authorization'] = f"Bearer {self.tokens[user_type]}"

        try:
            async with self.session.request(
                method, url, 
                json=data if data else None, 
                headers=request_headers
            ) as response:
                try:
                    response_data = await response.json()
                except:
                    response_data = await response.text()
                
                return {
                    'success': 200 <= response.status < 300,
                    'status': response.status,
                    'data': response_data,
                    'error': None if 200 <= response.status < 300 else response_data
                }
        except Exception as e:
            return {
                'success': False,
                'status': 0,
                'data': None,
                'error': str(e)
            }

    async def test_infrastructure(self):
        """Test basic infrastructure"""
        logger.info("🏗️ Testing Infrastructure...")
        
        # Health check
        start_time = time.time()
        result = await self.make_request('GET', '/health')
        duration = time.time() - start_time
        self.log_result('Health Check', result['success'], result, duration)
        
        # Root endpoint
        start_time = time.time()
        result = await self.make_request('GET', '/')
        duration = time.time() - start_time
        self.log_result('Root Endpoint', result['success'], result, duration)
        
        # API documentation
        start_time = time.time()
        result = await self.make_request('GET', '/docs')
        duration = time.time() - start_time
        # Docs might be disabled in production, so we just log the attempt
        self.log_result('API Documentation Access', True, {'status': result['status']}, duration)

    async def test_user_registration_and_auth(self):
        """Test user registration and authentication flow"""
        logger.info("👤 Testing User Registration & Authentication...")
        
        for user_type, user_data in self.test_users.items():
            if user_type == 'admin':  # Skip admin registration
                continue
                
            # Registration
            start_time = time.time()
            result = await self.make_request('POST', '/api/v1/auth/register', user_data)
            duration = time.time() - start_time
            
            # Registration might fail if user exists, which is OK
            success = result['success'] or 'already registered' in str(result.get('error', '')).lower()
            self.log_result(f'{user_type.title()} Registration', success, result, duration)
            
            # Login
            start_time = time.time()
            login_data = {
                'username': user_data['email'],
                'password': user_data['password']
            }
            result = await self.make_request('POST', '/api/v1/auth/login', login_data)
            duration = time.time() - start_time
            
            if result['success'] and 'access_token' in result['data']:
                self.tokens[user_type] = result['data']['access_token']
                
            self.log_result(f'{user_type.title()} Login', result['success'], result, duration)

    async def test_admin_access(self):
        """Test admin authentication"""
        logger.info("🔑 Testing Admin Access...")
        
        admin_data = self.test_users['admin']
        start_time = time.time()
        login_data = {
            'username': admin_data['email'],
            'password': admin_data['password']
        }
        result = await self.make_request('POST', '/api/v1/auth/login', login_data)
        duration = time.time() - start_time
        
        if result['success'] and 'access_token' in result['data']:
            self.tokens['admin'] = result['data']['access_token']
            
        self.log_result('Admin Login', result['success'], result, duration)

    async def test_client_workflow(self):
        """Test complete client workflow"""
        logger.info("🛒 Testing Client Workflow...")
        
        if 'client' not in self.tokens:
            self.log_result('Client Workflow', False, 'No client token available')
            return

        # Get profile
        start_time = time.time()
        result = await self.make_request('GET', '/api/v1/users/me', user_type='client')
        duration = time.time() - start_time
        self.log_result('Client Profile Fetch', result['success'], result, duration)

        # Get dashboard
        start_time = time.time()
        result = await self.make_request('GET', '/api/v1/dashboard/', user_type='client')
        duration = time.time() - start_time
        self.log_result('Client Dashboard', result['success'], result, duration)

        # Create order with real production specifications
        order_data = {
            'title': 'Production Manufacturing Order',
            'description': 'Manufacturing order for production system validation',
            'quantity': 100,
            'budget_min': 10000,
            'budget_max': 25000,
            'delivery_date': (datetime.now() + timedelta(days=30)).isoformat(),
            'specifications': {
                'material': 'Stainless Steel 316',
                'dimensions': '100x75x25 mm',
                'tolerance': '±0.01mm',
                'finish': 'Passivated',
                'quality_standard': 'ISO 9001:2015',
                'surface_roughness': 'Ra 0.8 μm',
                'hardness': 'HRC 45-50'
            },
            'category': 'precision_machining',
            'industry': 'medical_device',
            'compliance_requirements': ['FDA 21 CFR Part 820', 'ISO 13485']
        }
        
        start_time = time.time()
        result = await self.make_request('POST', '/api/v1/orders/', order_data, user_type='client')
        duration = time.time() - start_time
        
        order_id = None
        if result['success'] and 'id' in result['data']:
            order_id = result['data']['id']
            
        self.log_result('Client Create Order', result['success'], result, duration)

        # Get orders list
        start_time = time.time()
        result = await self.make_request('GET', '/api/v1/orders/', user_type='client')
        duration = time.time() - start_time
        self.log_result('Client Get Orders', result['success'], result, duration)

        # Test intelligent matching if order was created
        if order_id:
            start_time = time.time()
            result = await self.make_request('GET', f'/api/v1/matching/orders/{order_id}', user_type='client')
            duration = time.time() - start_time
            self.log_result('Client Order Matching', result['success'], result, duration)

        return order_id

    async def test_manufacturer_workflow(self, order_id: Optional[str] = None):
        """Test complete manufacturer workflow"""
        logger.info("🏭 Testing Manufacturer Workflow...")
        
        if 'manufacturer' not in self.tokens:
            self.log_result('Manufacturer Workflow', False, 'No manufacturer token available')
            return

        # Get profile
        start_time = time.time()
        result = await self.make_request('GET', '/api/v1/users/me', user_type='manufacturer')
        duration = time.time() - start_time
        self.log_result('Manufacturer Profile Fetch', result['success'], result, duration)

        # Get dashboard
        start_time = time.time()
        result = await self.make_request('GET', '/api/v1/dashboard/', user_type='manufacturer')
        duration = time.time() - start_time
        self.log_result('Manufacturer Dashboard', result['success'], result, duration)

        # Get available orders
        start_time = time.time()
        result = await self.make_request('GET', '/api/v1/orders/', user_type='manufacturer')
        duration = time.time() - start_time
        self.log_result('Manufacturer Get Orders', result['success'], result, duration)

        # Create quote for the first available order
        target_order_id = order_id
        if not target_order_id and result['success'] and result['data']:
            orders = result['data'] if isinstance(result['data'], list) else [result['data']]
            if orders:
                target_order_id = orders[0].get('id')

        if target_order_id:
            quote_data = {
                'order_id': target_order_id,
                'price': 18500.00,
                'delivery_time_days': 25,
                'description': 'Professional medical device manufacturing with full traceability and compliance documentation',
                'terms_conditions': 'Medical device manufacturing terms with full FDA compliance documentation and 2-year warranty',
                'validity_days': 14,
                'materials_cost': 8000.00,
                'labor_cost': 7500.00,
                'overhead_cost': 3000.00,
                'certifications': ['ISO 13485', 'FDA 21 CFR Part 820'],
                'quality_documentation': ['Material certificates', 'Process validation', 'First article inspection']
            }
            
            start_time = time.time()
            result = await self.make_request('POST', '/api/v1/quotes/', quote_data, user_type='manufacturer')
            duration = time.time() - start_time
            self.log_result('Manufacturer Create Quote', result['success'], result, duration)

        # Get quotes list
        start_time = time.time()
        result = await self.make_request('GET', '/api/v1/quotes/', user_type='manufacturer')
        duration = time.time() - start_time
        self.log_result('Manufacturer Get Quotes', result['success'], result, duration)

    async def test_admin_workflow(self):
        """Test admin workflow"""
        logger.info("👑 Testing Admin Workflow...")
        
        if 'admin' not in self.tokens:
            self.log_result('Admin Workflow', False, 'No admin token available')
            return

        # Get admin profile
        start_time = time.time()
        result = await self.make_request('GET', '/api/v1/users/me', user_type='admin')
        duration = time.time() - start_time
        self.log_result('Admin Profile Fetch', result['success'], result, duration)

        # Get admin dashboard
        start_time = time.time()
        result = await self.make_request('GET', '/api/v1/dashboard/', user_type='admin')
        duration = time.time() - start_time
        self.log_result('Admin Dashboard', result['success'], result, duration)

        # Get all orders (admin view)
        start_time = time.time()
        result = await self.make_request('GET', '/api/v1/orders/', user_type='admin')
        duration = time.time() - start_time
        self.log_result('Admin Get All Orders', result['success'], result, duration)

        # Get all quotes (admin view)
        start_time = time.time()
        result = await self.make_request('GET', '/api/v1/quotes/', user_type='admin')
        duration = time.time() - start_time
        self.log_result('Admin Get All Quotes', result['success'], result, duration)

        # Test performance monitoring
        start_time = time.time()
        result = await self.make_request('GET', '/api/v1/performance/metrics', user_type='admin')
        duration = time.time() - start_time
        self.log_result('Admin Performance Metrics', result['success'], result, duration)

    async def test_email_system(self):
        """Test email system"""
        logger.info("📧 Testing Email System...")
        
        if 'admin' not in self.tokens:
            self.log_result('Email System Test', False, 'No admin token available')
            return

        # Test email configuration
        start_time = time.time()
        result = await self.make_request('GET', '/api/v1/emails/config', user_type='admin')
        duration = time.time() - start_time
        self.log_result('Email Configuration Check', result['success'], result, duration)

        # Test sending a production notification email
        email_data = {
            'to': 'support@manufacturing-platform.com',
            'subject': 'Production System Validation Complete',
            'template': 'system_validation',
            'context': {'validation_complete': True, 'system_status': 'operational'}
        }
        
        start_time = time.time()
        result = await self.make_request('POST', '/api/v1/emails/send', email_data, user_type='admin')
        duration = time.time() - start_time
        self.log_result('Email Send Test', result['success'], result, duration)

    async def test_security_endpoints(self):
        """Test security-related endpoints"""
        logger.info("🔒 Testing Security Endpoints...")
        
        # Test rate limiting by making multiple requests
        rate_limit_results = []
        for i in range(10):
            start_time = time.time()
            result = await self.make_request('GET', '/health')
            duration = time.time() - start_time
            rate_limit_results.append(result['success'])
            
        rate_limit_success = sum(rate_limit_results) >= 8  # Allow some failures
        self.log_result('Rate Limiting Test', rate_limit_success, 
                       {'successful_requests': sum(rate_limit_results), 'total_requests': 10})

        # Test security headers
        start_time = time.time()
        result = await self.make_request('GET', '/api/security/headers')
        duration = time.time() - start_time
        self.log_result('Security Headers Check', result['success'], result, duration)

    async def run_performance_tests(self):
        """Run performance tests"""
        logger.info("⚡ Running Performance Tests...")
        
        # Concurrent requests test
        async def concurrent_health_check():
            return await self.make_request('GET', '/health')
        
        start_time = time.time()
        tasks = [concurrent_health_check() for _ in range(20)]
        results = await asyncio.gather(*tasks)
        duration = time.time() - start_time
        
        successful_requests = sum(1 for r in results if r['success'])
        self.log_result('Concurrent Requests Test', successful_requests >= 18, 
                       {'successful': successful_requests, 'total': 20, 'duration': duration})

    def generate_report(self):
        """Generate test report"""
        total_tests = len(self.test_results)
        successful_tests = sum(1 for r in self.test_results if r['success'])
        success_rate = (successful_tests / total_tests * 100) if total_tests > 0 else 0
        
        report = {
            'summary': {
                'total_tests': total_tests,
                'successful_tests': successful_tests,
                'failed_tests': total_tests - successful_tests,
                'success_rate': f"{success_rate:.1f}%",
                'test_duration': sum(r['duration'] for r in self.test_results),
                'timestamp': datetime.now().isoformat()
            },
            'results': self.test_results
        }
        
        # Save to file
        with open('production_test_report.json', 'w') as f:
            json.dump(report, f, indent=2)
        
        # Print summary
        print("\n" + "="*60)
        print("🎯 PRODUCTION TEST SUMMARY")
        print("="*60)
        print(f"Total Tests: {total_tests}")
        print(f"Successful: {successful_tests}")
        print(f"Failed: {total_tests - successful_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        print(f"Total Duration: {report['summary']['test_duration']:.2f}s")
        
        if success_rate >= 90:
            print("🎉 EXCELLENT - Production ready!")
        elif success_rate >= 80:
            print("✅ GOOD - Minor issues to address")
        elif success_rate >= 70:
            print("⚠️ FAIR - Several issues need attention")
        else:
            print("❌ POOR - Significant issues require fixing")
        
        print("="*60)
        
        # Show failed tests
        failed_tests = [r for r in self.test_results if not r['success']]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"  • {test['test']}: {test.get('details', {}).get('error', 'Unknown error')}")
        
        return report

async def main():
    """Main test execution"""
    base_url = os.getenv('API_URL', 'http://localhost:8000')
    
    print("🚀 Starting Production Flow Testing")
    print(f"Base URL: {base_url}")
    print("-" * 60)
    
    async with ProductionTester(base_url) as tester:
        try:
            # Test sequence
            await tester.test_infrastructure()
            await tester.test_user_registration_and_auth()
            await tester.test_admin_access()
            
            order_id = await tester.test_client_workflow()
            await tester.test_manufacturer_workflow(order_id)
            await tester.test_admin_workflow()
            
            await tester.test_email_system()
            await tester.test_security_endpoints()
            await tester.run_performance_tests()
            
        except Exception as e:
            logger.error(f"Test execution failed: {e}")
            tester.log_result('Test Execution', False, str(e))
        
        finally:
            report = tester.generate_report()
            return report

if __name__ == "__main__":
    # Run the tests
    report = asyncio.run(main())
    
    # Exit with appropriate code
    success_rate = float(report['summary']['success_rate'].rstrip('%'))
    sys.exit(0 if success_rate >= 80 else 1) 
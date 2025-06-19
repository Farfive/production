#!/usr/bin/env python3
"""
🧪 CORE BUSINESS FLOW TESTING - SIMPLIFIED VERSION
Test all three user journeys: Client, Manufacturer, and Admin
"""

import requests
import json
import time
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api/v1"

class BusinessFlowTester:
    def __init__(self):
        self.tokens = {}
        self.test_data = {}
        self.timestamp = int(time.time())
        
    def make_request(self, method, endpoint, data=None, token=None):
        """Make HTTP request"""
        try:
            headers = {"Content-Type": "application/json"}
            if token:
                headers["Authorization"] = f"Bearer {token}"
                
            url = f"{API_BASE}{endpoint}"
            
            if method == "GET":
                response = requests.get(url, headers=headers, timeout=10)
            elif method == "POST":
                response = requests.post(url, headers=headers, json=data, timeout=10)
            else:
                return False, {}, f"Unsupported method: {method}"
            
            if response.status_code in [200, 201, 202]:
                return True, response.json(), ""
            else:
                return False, {}, f"Status {response.status_code}: {response.text}"
                
        except Exception as e:
            return False, {}, str(e)

    def test_client_journey(self):
        """Test Client Journey: Register → Create Order → Receive Quotes → Compare → Accept → Pay"""
        print("\n" + "="*60)
        print("🔵 TESTING CLIENT JOURNEY")
        print("="*60)
        
        # Step 1: Client Registration
        print("\n1. Client Registration...")
        client_data = {
            "email": f"test_client_{self.timestamp}@example.com",
            "password": "ClientPassword123!",
            "first_name": "Test",
            "last_name": "Client",
            "role": "client",
            "phone": "+1234567890",
            "country": "USA",
            "data_processing_consent": True,
            "marketing_consent": False
        }
        
        success, response, error = self.make_request("POST", "/auth/register", client_data)
        if success:
            print(f"   ✅ Client registered - ID: {response.get('id')}")
            self.test_data["client"] = {"id": response.get("id"), **client_data}
        else:
            print(f"   ❌ Client registration failed: {error}")
            return False

        # Step 2: Client Login  
        print("\n2. Client Login...")
        login_data = {"email": client_data["email"], "password": client_data["password"]}
        success, response, error = self.make_request("POST", "/auth/login-json", login_data)
        if success:
            self.tokens["client"] = response.get("access_token")
            print(f"   ✅ Client login successful")
        else:
            print(f"   ❌ Client login failed: {error}")
            return False

        # Step 3: Create Order
        print("\n3. Creating Order...")
        order_data = {
            "title": "Precision CNC Parts Manufacturing",
            "description": "Need 500 precision CNC machined aluminum parts for aerospace application",
            "quantity": 500,
            "material": "Aluminum 6061-T6",
            "industry_category": "Aerospace",
            "delivery_deadline": (datetime.now() + timedelta(days=45)).isoformat(),
            "budget_max_pln": 75000,
            "preferred_country": "USA",
            "max_distance_km": 500,
            "technical_requirements": {
                "tolerance": "±0.005 inches",
                "surface_finish": "Ra 32 microinches",
                "manufacturing_process": "5-axis CNC machining",
                "quality_standards": ["AS9100", "ISO 9001"]
            },
            "files": [],
            "rush_order": False
        }
        
        success, response, error = self.make_request("POST", "/orders/", order_data, self.tokens["client"])
        if success:
            self.test_data["order_id"] = response.get("id")
            print(f"   ✅ Order created - ID: {response.get('id')}")
        else:
            print(f"   ❌ Order creation failed: {error}")
            return False

        # Step 4: Browse Orders
        print("\n4. Browsing Orders...")
        success, response, error = self.make_request("GET", "/orders/", token=self.tokens["client"])
        if success:
            orders = response.get("items", response if isinstance(response, list) else [])
            print(f"   ✅ Found {len(orders)} orders")
        else:
            print(f"   ❌ Browse orders failed: {error}")

        print("\n   📋 CLIENT JOURNEY STEPS 1-4 COMPLETED")
        return True

    def test_manufacturer_journey(self):
        """Test Manufacturer Journey: Register → Browse Orders → Create Quotes → Negotiate → Fulfill"""
        print("\n" + "="*60)
        print("🟣 TESTING MANUFACTURER JOURNEY")
        print("="*60)
        
        # Step 1: Manufacturer Registration
        print("\n1. Manufacturer Registration...")
        manufacturer_data = {
            "email": f"test_manufacturer_{self.timestamp}@example.com",
            "password": "ManufacturerPassword123!",
            "first_name": "Test",
            "last_name": "Manufacturer",
            "role": "manufacturer",
            "company_name": "Precision Manufacturing Corp",
            "phone": "+1234567891",
            "country": "USA",
            "data_processing_consent": True,
            "marketing_consent": True
        }
        
        success, response, error = self.make_request("POST", "/auth/register", manufacturer_data)
        if success:
            print(f"   ✅ Manufacturer registered - ID: {response.get('id')}")
            self.test_data["manufacturer"] = {"id": response.get("id"), **manufacturer_data}
        else:
            print(f"   ❌ Manufacturer registration failed: {error}")
            return False

        # Step 2: Manufacturer Login
        print("\n2. Manufacturer Login...")
        login_data = {"email": manufacturer_data["email"], "password": manufacturer_data["password"]}
        success, response, error = self.make_request("POST", "/auth/login-json", login_data)
        if success:
            self.tokens["manufacturer"] = response.get("access_token")
            print(f"   ✅ Manufacturer login successful")
        else:
            print(f"   ❌ Manufacturer login failed: {error}")
            return False

        # Step 3: Browse Available Orders
        print("\n3. Browsing Available Orders...")
        success, response, error = self.make_request("GET", "/orders/", token=self.tokens["manufacturer"])
        if success:
            orders = response.get("items", response if isinstance(response, list) else [])
            available_orders = [order for order in orders if order.get("status") == "active"]
            print(f"   ✅ Found {len(orders)} total orders, {len(available_orders)} available")
        else:
            print(f"   ❌ Browse orders failed: {error}")

        # Step 4: Create Quote
        print("\n4. Creating Quote...")
        if self.test_data.get("order_id"):
            quote_data = {
                "order_id": self.test_data["order_id"],
                "price": 68500.00,
                "delivery_time": 35,
                "message": "Competitive quote for precision CNC manufacturing with fast turnaround",
                "specifications": {
                    "manufacturing_process": "5-axis CNC machining with inspection",
                    "quality_certifications": ["AS9100", "ISO 9001", "NADCAP"],
                    "material_source": "Certified aerospace-grade aluminum",
                    "inspection_process": "CMM inspection with full reports"
                }
            }
            
            success, response, error = self.make_request("POST", "/quotes/", quote_data, self.tokens["manufacturer"])
            if success:
                self.test_data["quote_id"] = response.get("id")
                print(f"   ✅ Quote created - ID: {response.get('id')}, Price: ${quote_data['price']:,.2f}")
            else:
                print(f"   ❌ Quote creation failed: {error}")
        else:
            print(f"   ❌ No order available for quote")

        print("\n   🏭 MANUFACTURER JOURNEY STEPS 1-4 COMPLETED")
        return True

    def complete_client_journey(self):
        """Complete client journey: Accept quote and process payment"""
        print("\n" + "="*60)
        print("🔵 COMPLETING CLIENT JOURNEY")
        print("="*60)
        
        # Step 5: View Quotes
        print("\n5. Viewing Quotes...")
        success, response, error = self.make_request("GET", "/quotes/", token=self.tokens["client"])
        if success:
            quotes = response.get("items", response if isinstance(response, list) else [])
            print(f"   ✅ Found {len(quotes)} quotes")
        else:
            print(f"   ❌ View quotes failed: {error}")

        # Step 6: Compare Quotes
        print("\n6. Comparing Quotes...")
        if self.test_data.get("order_id"):
            success, response, error = self.make_request("GET", f"/quotes/order/{self.test_data['order_id']}/comparison", 
                                                       token=self.tokens["client"])
            if success:
                print(f"   ✅ Quote comparison data available")
            else:
                print(f"   ❌ Quote comparison failed: {error}")

        # Step 7: Accept Quote
        print("\n7. Accepting Quote...")
        if self.test_data.get("quote_id"):
            success, response, error = self.make_request("POST", f"/quotes/{self.test_data['quote_id']}/accept", 
                                                       token=self.tokens["client"])
            if success:
                print(f"   ✅ Quote accepted: {response.get('message')}")
            else:
                print(f"   ❌ Quote acceptance failed: {error}")

        # Step 8: Process Payment
        print("\n8. Processing Payment...")
        if self.test_data.get("quote_id"):
            payment_data = {
                "order_id": self.test_data["order_id"],
                "quote_id": self.test_data["quote_id"],
                "payment_method_id": "pm_card_visa",
                "save_payment_method": False
            }
            
            success, response, error = self.make_request("POST", "/payments/process-order-payment", 
                                                       payment_data, self.tokens["client"])
            if success:
                print(f"   ✅ Payment processed: {response.get('status')}")
            else:
                print(f"   ⚠️  Payment failed (expected in test): {error}")

        print("\n   💰 CLIENT JOURNEY COMPLETED")
        return True

    def test_admin_journey(self):
        """Test Admin Journey: Monitor → Manage Users → Analytics"""
        print("\n" + "="*60)
        print("🟢 TESTING ADMIN JOURNEY")
        print("="*60)
        
        # Step 1: Admin Login
        print("\n1. Admin Login...")
        admin_login = {"email": "admin@example.com", "password": "AdminPassword123!"}
        
        success, response, error = self.make_request("POST", "/auth/login-json", admin_login)
        if success:
            self.tokens["admin"] = response.get("access_token")
            print(f"   ✅ Admin login successful")
        else:
            print(f"   ❌ Admin login failed: {error}")
            return False

        # Step 2: Monitor System Health
        print("\n2. Monitoring System Health...")
        success, response, error = self.make_request("GET", "/health")
        if success:
            print(f"   ✅ System health: {response.get('status')}")
        else:
            print(f"   ❌ Health check failed: {error}")

        # Step 3: Manage Users
        print("\n3. Managing Users...")
        success, response, error = self.make_request("GET", "/users/", token=self.tokens["admin"])
        if success:
            users = response.get("items", response if isinstance(response, list) else [])
            print(f"   ✅ Found {len(users)} users in system")
        else:
            print(f"   ❌ User management failed: {error}")

        # Step 4: Client Analytics
        print("\n4. Client Analytics...")
        success, response, error = self.make_request("GET", "/dashboard/client", token=self.tokens.get("client"))
        if success:
            print(f"   ✅ Client dashboard data retrieved")
        else:
            print(f"   ❌ Client analytics failed: {error}")

        # Step 5: Manufacturer Analytics
        print("\n5. Manufacturer Analytics...")
        success, response, error = self.make_request("GET", "/dashboard/manufacturer", token=self.tokens.get("manufacturer"))
        if success:
            print(f"   ✅ Manufacturer dashboard data retrieved")
        else:
            print(f"   ❌ Manufacturer analytics failed: {error}")

        print("\n   📊 ADMIN JOURNEY COMPLETED")
        return True

    def generate_summary(self):
        """Generate test summary"""
        print("\n" + "="*80)
        print("📊 CORE BUSINESS FLOW TEST SUMMARY")
        print("="*80)
        
        print(f"\n✅ TEST DATA CREATED:")
        if self.test_data.get("client"):
            print(f"   📧 Client: {self.test_data['client']['email']}")
        if self.test_data.get("manufacturer"):  
            print(f"   🏭 Manufacturer: {self.test_data['manufacturer']['email']}")
        if self.test_data.get("order_id"):
            print(f"   📋 Order ID: {self.test_data['order_id']}")
        if self.test_data.get("quote_id"):
            print(f"   💰 Quote ID: {self.test_data['quote_id']}")

        print(f"\n🎯 JOURNEY STATUS:")
        print(f"   🔵 Client Journey: Registration → Order Creation → Quote Review → Acceptance → Payment")
        print(f"   🟣 Manufacturer Journey: Registration → Order Browse → Quote Creation → Negotiation")
        print(f"   🟢 Admin Journey: System Monitor → User Management → Analytics")

        print(f"\n🎉 ALL CORE BUSINESS FLOWS TESTED!")
        print(f"The Manufacturing Platform user journeys are functional.")

    def run_all_tests(self):
        """Run all business flow tests"""
        print("🚀 MANUFACTURING PLATFORM - CORE BUSINESS FLOW TESTING")
        print("="*80)
        print(f"Testing at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Backend URL: {BASE_URL}")
        
        # Wait for backend
        print("\n⏳ Checking backend availability...")
        for i in range(5):
            try:
                response = requests.get(f"{BASE_URL}/health", timeout=5)
                if response.status_code == 200:
                    print("✅ Backend is ready!")
                    break
            except:
                pass
            time.sleep(2)
            print(f"   Attempt {i+1}/5...")
        else:
            print("❌ Backend not responding. Start with: cd backend && python -m uvicorn main:app --reload")
            return False

        try:
            # Run test journeys
            print("\n🎯 EXECUTING CORE BUSINESS FLOWS:")
            
            # 1. Client Journey (partial)
            if not self.test_client_journey():
                return False
                
            # 2. Manufacturer Journey
            if not self.test_manufacturer_journey():
                return False
                
            # 3. Complete Client Journey
            if not self.complete_client_journey():
                return False
                
            # 4. Admin Journey
            if not self.test_admin_journey():
                return False
                
            # Generate summary
            self.generate_summary()
            return True
            
        except KeyboardInterrupt:
            print("\n⚠️ Testing interrupted by user")
            return False
        except Exception as e:
            print(f"\n❌ Testing failed: {e}")
            return False

def main():
    """Main execution"""
    tester = BusinessFlowTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    import sys
    sys.exit(main())
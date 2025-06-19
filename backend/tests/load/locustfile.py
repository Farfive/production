"""
Load testing configuration for Manufacturing Platform API
"""
import json
import random
from locust import HttpUser, task, between, events
from faker import Faker

fake = Faker()


class ManufacturingPlatformUser(HttpUser):
    """Simulates a user of the Manufacturing Platform"""
    
    wait_time = between(1, 3)  # Wait 1-3 seconds between tasks
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.auth_token = None
        self.user_id = None
        self.user_role = None
        self.orders = []
        self.quotes = []

    def on_start(self):
        """Called when a user starts"""
        self.register_and_login()

    def on_stop(self):
        """Called when a user stops"""
        if self.auth_token:
            self.logout()

    def register_and_login(self):
        """Register a new user and login"""
        # Register user
        user_data = {
            "email": fake.email(),
            "password": "TestPassword123!",
            "first_name": fake.first_name(),
            "last_name": fake.last_name(),
            "company_name": fake.company(),
            "role": random.choice(["buyer", "manufacturer"])
        }
        
        with self.client.post("/api/v1/auth/register", 
                             json=user_data, 
                             catch_response=True) as response:
            if response.status_code == 201:
                response.success()
                self.user_role = user_data["role"]
            else:
                response.failure(f"Registration failed: {response.text}")
                return

        # Login
        login_data = {
            "username": user_data["email"],
            "password": user_data["password"]
        }
        
        with self.client.post("/api/v1/auth/login", 
                             data=login_data, 
                             catch_response=True) as response:
            if response.status_code == 200:
                response.success()
                token_data = response.json()
                self.auth_token = token_data["access_token"]
                self.client.headers.update({
                    "Authorization": f"Bearer {self.auth_token}"
                })
                
                # Get user profile
                self.get_user_profile()
            else:
                response.failure(f"Login failed: {response.text}")

    def get_user_profile(self):
        """Get current user profile"""
        with self.client.get("/api/v1/auth/me", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
                user_data = response.json()
                self.user_id = user_data["id"]
            else:
                response.failure(f"Get profile failed: {response.text}")

    def logout(self):
        """Logout user"""
        if self.auth_token:
            with self.client.post("/api/v1/auth/logout", catch_response=True) as response:
                if response.status_code == 200:
                    response.success()
                else:
                    response.failure(f"Logout failed: {response.text}")

    @task(3)
    def view_orders(self):
        """View orders list"""
        with self.client.get("/api/v1/orders", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
                orders_data = response.json()
                if orders_data.get("items"):
                    self.orders = orders_data["items"]
            else:
                response.failure(f"View orders failed: {response.text}")

    @task(2)
    def view_order_details(self):
        """View specific order details"""
        if self.orders:
            order_id = random.choice(self.orders)["id"]
            with self.client.get(f"/api/v1/orders/{order_id}", 
                               catch_response=True) as response:
                if response.status_code == 200:
                    response.success()
                else:
                    response.failure(f"View order details failed: {response.text}")

    @task(1)
    def create_order(self):
        """Create a new order (buyers only)"""
        if self.user_role != "buyer":
            return

        order_data = {
            "title": fake.catch_phrase(),
            "description": fake.text(max_nb_chars=500),
            "quantity": random.randint(1, 1000),
            "material": random.choice(["Steel", "Aluminum", "Plastic", "Titanium"]),
            "deadline": fake.future_date(end_date="+30d").isoformat(),
            "budget_min": random.randint(100, 5000),
            "budget_max": random.randint(5000, 50000),
            "specifications": {
                "dimensions": f"{random.randint(1, 100)}x{random.randint(1, 100)}x{random.randint(1, 100)}mm",
                "tolerance": "±0.1mm",
                "finish": random.choice(["Anodized", "Powder Coated", "Raw", "Polished"])
            }
        }

        with self.client.post("/api/v1/orders", 
                             json=order_data, 
                             catch_response=True) as response:
            if response.status_code == 201:
                response.success()
                new_order = response.json()
                self.orders.append(new_order)
            else:
                response.failure(f"Create order failed: {response.text}")

    @task(2)
    def view_quotes(self):
        """View quotes list"""
        with self.client.get("/api/v1/quotes", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
                quotes_data = response.json()
                if quotes_data.get("items"):
                    self.quotes = quotes_data["items"]
            else:
                response.failure(f"View quotes failed: {response.text}")

    @task(1)
    def create_quote(self):
        """Create a quote (manufacturers only)"""
        if self.user_role != "manufacturer" or not self.orders:
            return

        # Get a random order to quote on
        order_id = random.choice(self.orders)["id"]
        
        quote_data = {
            "order_id": order_id,
            "price": random.randint(1000, 10000),
            "delivery_time": random.randint(7, 30),
            "message": fake.text(max_nb_chars=200),
            "terms": fake.text(max_nb_chars=100)
        }

        with self.client.post("/api/v1/quotes", 
                             json=quote_data, 
                             catch_response=True) as response:
            if response.status_code == 201:
                response.success()
                new_quote = response.json()
                self.quotes.append(new_quote)
            else:
                response.failure(f"Create quote failed: {response.text}")

    @task(1)
    def search_orders(self):
        """Search for orders"""
        search_terms = ["steel", "aluminum", "machining", "fabrication", "custom"]
        search_term = random.choice(search_terms)
        
        with self.client.get(f"/api/v1/search/orders?q={search_term}", 
                           catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Search orders failed: {response.text}")

    @task(1)
    def search_manufacturers(self):
        """Search for manufacturers"""
        search_terms = ["cnc", "3d printing", "welding", "casting", "precision"]
        search_term = random.choice(search_terms)
        
        with self.client.get(f"/api/v1/search/manufacturers?q={search_term}", 
                           catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Search manufacturers failed: {response.text}")

    @task(1)
    def view_dashboard(self):
        """View dashboard analytics"""
        with self.client.get("/api/v1/analytics/dashboard", 
                           catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"View dashboard failed: {response.text}")

    @task(1)
    def view_notifications(self):
        """View notifications"""
        with self.client.get("/api/v1/notifications", 
                           catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"View notifications failed: {response.text}")

    @task(1)
    def update_profile(self):
        """Update user profile"""
        profile_data = {
            "first_name": fake.first_name(),
            "last_name": fake.last_name(),
            "company_name": fake.company(),
            "phone": fake.phone_number()
        }

        with self.client.put("/api/v1/users/profile", 
                           json=profile_data, 
                           catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Update profile failed: {response.text}")


class BuyerUser(ManufacturingPlatformUser):
    """Simulates a buyer user with buyer-specific behavior"""
    
    weight = 3  # 60% of users are buyers

    def register_and_login(self):
        """Override to force buyer role"""
        # Register user as buyer
        user_data = {
            "email": fake.email(),
            "password": "TestPassword123!",
            "first_name": fake.first_name(),
            "last_name": fake.last_name(),
            "company_name": fake.company(),
            "role": "buyer"
        }
        
        with self.client.post("/api/v1/auth/register", 
                             json=user_data, 
                             catch_response=True) as response:
            if response.status_code == 201:
                response.success()
                self.user_role = "buyer"
            else:
                response.failure(f"Registration failed: {response.text}")
                return

        # Login
        login_data = {
            "username": user_data["email"],
            "password": user_data["password"]
        }
        
        with self.client.post("/api/v1/auth/login", 
                             data=login_data, 
                             catch_response=True) as response:
            if response.status_code == 200:
                response.success()
                token_data = response.json()
                self.auth_token = token_data["access_token"]
                self.client.headers.update({
                    "Authorization": f"Bearer {self.auth_token}"
                })
                self.get_user_profile()
            else:
                response.failure(f"Login failed: {response.text}")

    @task(5)
    def view_my_orders(self):
        """View buyer's own orders"""
        with self.client.get("/api/v1/orders/my-orders", 
                           catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"View my orders failed: {response.text}")

    @task(2)
    def accept_quote(self):
        """Accept a quote"""
        if self.quotes:
            quote_id = random.choice(self.quotes)["id"]
            with self.client.post(f"/api/v1/quotes/{quote_id}/accept", 
                                catch_response=True) as response:
                if response.status_code == 200:
                    response.success()
                else:
                    response.failure(f"Accept quote failed: {response.text}")


class ManufacturerUser(ManufacturingPlatformUser):
    """Simulates a manufacturer user with manufacturer-specific behavior"""
    
    weight = 2  # 40% of users are manufacturers

    def register_and_login(self):
        """Override to force manufacturer role"""
        # Register user as manufacturer
        user_data = {
            "email": fake.email(),
            "password": "TestPassword123!",
            "first_name": fake.first_name(),
            "last_name": fake.last_name(),
            "company_name": fake.company(),
            "role": "manufacturer"
        }
        
        with self.client.post("/api/v1/auth/register", 
                             json=user_data, 
                             catch_response=True) as response:
            if response.status_code == 201:
                response.success()
                self.user_role = "manufacturer"
            else:
                response.failure(f"Registration failed: {response.text}")
                return

        # Login
        login_data = {
            "username": user_data["email"],
            "password": user_data["password"]
        }
        
        with self.client.post("/api/v1/auth/login", 
                             data=login_data, 
                             catch_response=True) as response:
            if response.status_code == 200:
                response.success()
                token_data = response.json()
                self.auth_token = token_data["access_token"]
                self.client.headers.update({
                    "Authorization": f"Bearer {self.auth_token}"
                })
                self.get_user_profile()
            else:
                response.failure(f"Login failed: {response.text}")

    @task(5)
    def view_my_quotes(self):
        """View manufacturer's own quotes"""
        with self.client.get("/api/v1/quotes/my-quotes", 
                           catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"View my quotes failed: {response.text}")

    @task(3)
    def browse_orders_for_quoting(self):
        """Browse orders to find quoting opportunities"""
        with self.client.get("/api/v1/orders?status=published", 
                           catch_response=True) as response:
            if response.status_code == 200:
                response.success()
                orders_data = response.json()
                if orders_data.get("items"):
                    self.orders = orders_data["items"]
            else:
                response.failure(f"Browse orders failed: {response.text}")


# Event listeners for custom metrics
@events.request.add_listener
def my_request_handler(request_type, name, response_time, response_length, response, context, exception, start_time, url, **kwargs):
    """Custom request handler for additional metrics"""
    if exception:
        print(f"Request failed: {name} - {exception}")


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Called when test starts"""
    print("Load test starting...")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Called when test stops"""
    print("Load test completed.")
    
    # Print summary statistics
    stats = environment.stats
    print(f"\nLoad Test Summary:")
    print(f"Total requests: {stats.total.num_requests}")
    print(f"Total failures: {stats.total.num_failures}")
    print(f"Average response time: {stats.total.avg_response_time:.2f}ms")
    print(f"95th percentile: {stats.total.get_response_time_percentile(0.95):.2f}ms")
    print(f"Requests per second: {stats.total.current_rps:.2f}")


# Custom load test scenarios
class StressTestUser(ManufacturingPlatformUser):
    """High-intensity user for stress testing"""
    
    wait_time = between(0.1, 0.5)  # Very short wait times
    
    @task(10)
    def rapid_api_calls(self):
        """Make rapid API calls to stress test the system"""
        endpoints = [
            "/api/v1/orders",
            "/api/v1/quotes",
            "/api/v1/auth/me",
            "/api/v1/notifications"
        ]
        
        endpoint = random.choice(endpoints)
        with self.client.get(endpoint, catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Rapid API call failed: {response.text}")


class SpikeTestUser(ManufacturingPlatformUser):
    """User for spike testing - sudden load increases"""
    
    wait_time = between(0, 1)
    
    @task(20)
    def spike_load(self):
        """Generate spike load"""
        # Simulate sudden burst of activity
        for _ in range(5):
            with self.client.get("/api/v1/orders", catch_response=True) as response:
                if response.status_code != 200:
                    response.failure(f"Spike test failed: {response.text}")
                else:
                    response.success()


# Load test profiles
class LoadTestProfiles:
    """Different load test profiles for various scenarios"""
    
    @staticmethod
    def normal_load():
        """Normal load profile"""
        return {
            "users": 50,
            "spawn_rate": 2,
            "run_time": "10m"
        }
    
    @staticmethod
    def stress_test():
        """Stress test profile"""
        return {
            "users": 200,
            "spawn_rate": 10,
            "run_time": "15m"
        }
    
    @staticmethod
    def spike_test():
        """Spike test profile"""
        return {
            "users": 500,
            "spawn_rate": 50,
            "run_time": "5m"
        }
    
    @staticmethod
    def endurance_test():
        """Endurance test profile"""
        return {
            "users": 100,
            "spawn_rate": 1,
            "run_time": "60m"
        } 
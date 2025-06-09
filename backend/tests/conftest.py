"""
Pytest configuration and fixtures for the manufacturing platform backend
"""
import asyncio
import os
import pytest
import tempfile
from typing import AsyncGenerator, Generator
from unittest.mock import Mock, patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient
from httpx import AsyncClient
import stripe
from faker import Faker

from app.core.database import Base, get_db
from app.core.config import settings
from app.models.user import User
from app.models.order import Order
from app.models.quote import Quote
from app.models.payment import Payment
from app.services.email import EmailService
from main import app

# Initialize Faker
fake = Faker()

# Test database URL
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

# Create test engine
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
def db_session() -> Generator[Session, None, None]:
    """Create a fresh database session for each test."""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """Create a test client with database dependency override."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
async def async_client(db_session: Session) -> AsyncGenerator[AsyncClient, None]:
    """Create an async test client."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
def mock_stripe():
    """Mock Stripe API calls."""
    with patch('stripe.Customer.create') as mock_customer_create, \
         patch('stripe.PaymentIntent.create') as mock_payment_intent_create, \
         patch('stripe.PaymentIntent.confirm') as mock_payment_intent_confirm, \
         patch('stripe.Webhook.construct_event') as mock_webhook_construct:
        
        # Configure mock responses
        mock_customer_create.return_value = Mock(id="cus_test123")
        mock_payment_intent_create.return_value = Mock(
            id="pi_test123",
            client_secret="pi_test123_secret_test",
            status="requires_payment_method"
        )
        mock_payment_intent_confirm.return_value = Mock(
            id="pi_test123",
            status="succeeded"
        )
        mock_webhook_construct.return_value = Mock(
            type="payment_intent.succeeded",
            data=Mock(object=Mock(id="pi_test123"))
        )
        
        yield {
            'customer_create': mock_customer_create,
            'payment_intent_create': mock_payment_intent_create,
            'payment_intent_confirm': mock_payment_intent_confirm,
            'webhook_construct': mock_webhook_construct
        }


@pytest.fixture
def mock_email_service():
    """Mock email service."""
    with patch.object(EmailService, 'send_email') as mock_send, \
         patch.object(EmailService, 'send_template_email') as mock_send_template:
        
        mock_send.return_value = {"message_id": "test_message_id"}
        mock_send_template.return_value = {"message_id": "test_template_message_id"}
        
        yield {
            'send_email': mock_send,
            'send_template_email': mock_send_template
        }


@pytest.fixture
def sample_user_data():
    """Generate sample user data."""
    return {
        "email": fake.email(),
        "password": "TestPassword123!",
        "first_name": fake.first_name(),
        "last_name": fake.last_name(),
        "company_name": fake.company(),
        "phone": fake.phone_number(),
        "role": "buyer"
    }


@pytest.fixture
def sample_manufacturer_data():
    """Generate sample manufacturer data."""
    return {
        "email": fake.email(),
        "password": "TestPassword123!",
        "first_name": fake.first_name(),
        "last_name": fake.last_name(),
        "company_name": fake.company(),
        "phone": fake.phone_number(),
        "role": "manufacturer",
        "capabilities": ["CNC Machining", "3D Printing"],
        "certifications": ["ISO 9001", "AS9100"],
        "location": {
            "address": fake.address(),
            "city": fake.city(),
            "state": fake.state(),
            "country": fake.country(),
            "postal_code": fake.postcode()
        }
    }


@pytest.fixture
def authenticated_user(client: TestClient, sample_user_data: dict):
    """Create and authenticate a user."""
    # Register user
    response = client.post("/api/v1/auth/register", json=sample_user_data)
    assert response.status_code == 201
    user_data = response.json()
    
    # Login user
    login_response = client.post("/api/v1/auth/login", data={
        "username": sample_user_data["email"],
        "password": sample_user_data["password"]
    })
    assert login_response.status_code == 200
    token_data = login_response.json()
    
    return {
        "user": user_data,
        "token": token_data["access_token"],
        "headers": {"Authorization": f"Bearer {token_data['access_token']}"}
    }


@pytest.fixture
def authenticated_manufacturer(client: TestClient, sample_manufacturer_data: dict):
    """Create and authenticate a manufacturer."""
    # Register manufacturer
    response = client.post("/api/v1/auth/register", json=sample_manufacturer_data)
    assert response.status_code == 201
    manufacturer_data = response.json()
    
    # Login manufacturer
    login_response = client.post("/api/v1/auth/login", data={
        "username": sample_manufacturer_data["email"],
        "password": sample_manufacturer_data["password"]
    })
    assert login_response.status_code == 200
    token_data = login_response.json()
    
    return {
        "manufacturer": manufacturer_data,
        "token": token_data["access_token"],
        "headers": {"Authorization": f"Bearer {token_data['access_token']}"}
    }


@pytest.fixture
def sample_order_data():
    """Generate sample order data."""
    return {
        "title": fake.catch_phrase(),
        "description": fake.text(max_nb_chars=500),
        "quantity": fake.random_int(min=1, max=1000),
        "material": fake.random_element(elements=("Steel", "Aluminum", "Plastic", "Titanium")),
        "deadline": fake.future_date(end_date="+30d").isoformat(),
        "budget_min": fake.random_int(min=100, max=5000),
        "budget_max": fake.random_int(min=5000, max=50000),
        "specifications": {
            "dimensions": f"{fake.random_int(1, 100)}x{fake.random_int(1, 100)}x{fake.random_int(1, 100)}mm",
            "tolerance": "±0.1mm",
            "finish": fake.random_element(elements=("Anodized", "Powder Coated", "Raw", "Polished"))
        }
    }


@pytest.fixture
def sample_quote_data():
    """Generate sample quote data."""
    return {
        "price": fake.random_int(min=1000, max=10000),
        "delivery_time": fake.random_int(min=7, max=30),
        "message": fake.text(max_nb_chars=200),
        "terms": fake.text(max_nb_chars=100)
    }


@pytest.fixture
def temp_file():
    """Create a temporary file for testing file uploads."""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
        tmp.write(b"Test file content")
        tmp.flush()
        yield tmp.name
    os.unlink(tmp.name)


@pytest.fixture
def mock_websocket():
    """Mock WebSocket connections."""
    with patch('app.services.websocket_handler.WebSocketManager') as mock_ws:
        mock_ws.return_value.connect = Mock()
        mock_ws.return_value.disconnect = Mock()
        mock_ws.return_value.send_personal_message = Mock()
        mock_ws.return_value.broadcast = Mock()
        yield mock_ws


@pytest.fixture
def mock_celery():
    """Mock Celery tasks."""
    with patch('app.tasks.email_tasks.send_email_task.delay') as mock_email_task, \
         patch('app.tasks.notification_tasks.send_notification_task.delay') as mock_notification_task:
        
        mock_email_task.return_value = Mock(id="test_task_id")
        mock_notification_task.return_value = Mock(id="test_notification_task_id")
        
        yield {
            'email_task': mock_email_task,
            'notification_task': mock_notification_task
        }


# Performance testing fixtures
@pytest.fixture
def performance_test_data():
    """Generate data for performance testing."""
    return {
        "users": [
            {
                "email": fake.email(),
                "password": "TestPassword123!",
                "first_name": fake.first_name(),
                "last_name": fake.last_name(),
                "company_name": fake.company()
            }
            for _ in range(100)
        ],
        "orders": [
            {
                "title": fake.catch_phrase(),
                "description": fake.text(max_nb_chars=500),
                "quantity": fake.random_int(min=1, max=1000),
                "material": fake.random_element(elements=("Steel", "Aluminum", "Plastic")),
                "budget_min": fake.random_int(min=100, max=5000),
                "budget_max": fake.random_int(min=5000, max=50000)
            }
            for _ in range(50)
        ]
    }


# Security testing fixtures
@pytest.fixture
def malicious_payloads():
    """Common malicious payloads for security testing."""
    return {
        "sql_injection": [
            "'; DROP TABLE users; --",
            "1' OR '1'='1",
            "admin'--",
            "' UNION SELECT * FROM users --"
        ],
        "xss": [
            "<script>alert('XSS')</script>",
            "javascript:alert('XSS')",
            "<img src=x onerror=alert('XSS')>",
            "';alert(String.fromCharCode(88,83,83))//';alert(String.fromCharCode(88,83,83))//\";alert(String.fromCharCode(88,83,83))//\";alert(String.fromCharCode(88,83,83))//--></SCRIPT>\">'><SCRIPT>alert(String.fromCharCode(88,83,83))</SCRIPT>"
        ],
        "command_injection": [
            "; ls -la",
            "| cat /etc/passwd",
            "&& rm -rf /",
            "`whoami`"
        ]
    }


@pytest.fixture(autouse=True)
def setup_test_environment():
    """Setup test environment variables."""
    os.environ.update({
        "TESTING": "true",
        "DATABASE_URL": SQLALCHEMY_DATABASE_URL,
        "SECRET_KEY": "test_secret_key_for_testing_only",
        "STRIPE_SECRET_KEY": "sk_test_fake_key_for_testing",
        "STRIPE_PUBLISHABLE_KEY": "pk_test_fake_key_for_testing",
        "SENDGRID_API_KEY": "SG.fake_key_for_testing",
        "REDIS_URL": "redis://localhost:6379/1"
    })
    yield
    # Cleanup is handled by pytest automatically 
import asyncio
from datetime import datetime, timedelta
from typing import Optional

import httpx
import pytest

BASE_URL = "http://localhost:8000"
TEST_EMAIL_DOMAIN = "example.com"


class UserRole:
    CLIENT = "client"
    MANUFACTURER = "manufacturer"


class TestUser:
    def __init__(self, role: str, email_prefix: str):
        ts = int(datetime.now().timestamp())
        self.email = f"{email_prefix}_{ts}@{TEST_EMAIL_DOMAIN}"
        self.password = f"{role.capitalize()}Pass123!"
        self.first_name = "E2E"
        self.last_name = role.capitalize()
        self.role = role
        self.company_name = f"{role.capitalize()} Corp"
        self.access_token: Optional[str] = None
        self.user_id: Optional[int] = None


@pytest.fixture(scope="session")
async def http_client():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=60.0) as client:
        yield client


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_complete_order_workflow(http_client):
    """Full happy-path order workflow covering:
    1. Registration + login for client and manufacturer
    2. Order creation by client
    3. Quote submission by manufacturer
    4. Quote acceptance by client
    5. Payment processing
    The test asserts HTTP 2xx responses for each step and key invariants.
    """

    # --- 1. create and authenticate users ---
    client_user = TestUser(UserRole.CLIENT, "client")
    manufacturer_user = TestUser(UserRole.MANUFACTURER, "manufacturer")

    for user in (client_user, manufacturer_user):
        # Register
        resp = await http_client.post(
            "/api/v1/auth/register",
            json={
                "email": user.email,
                "password": user.password,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role,
                "company_name": user.company_name,
                "data_processing_consent": True,
            },
        )
        assert resp.status_code == 200, resp.text
        user.user_id = resp.json()["id"]

        # Login to obtain JWT
        resp = await http_client.post(
            "/api/v1/auth/login-json", json={"email": user.email, "password": user.password}
        )
        assert resp.status_code == 200, resp.text
        user.access_token = resp.json()["access_token"]
        assert user.access_token

    # --- 2. client creates an order ---
    headers_client = {"Authorization": f"Bearer {client_user.access_token}"}
    order_payload = {
        "title": "E2E Order",
        "description": "Test CNC machining parts",
        "category": "machining",
        "quantity": 10,
        "material": "aluminum",
        "budget": 1200.0,
        "delivery_deadline": (datetime.utcnow() + timedelta(days=30)).isoformat(),
        "specifications": {"grade": "6061"},
    }
    resp = await http_client.post("/api/v1/orders/", json=order_payload, headers=headers_client)
    assert resp.status_code in (200, 201), resp.text
    order_id = resp.json()["id"]

    # --- 3. manufacturer submits quote on the order ---
    headers_manu = {"Authorization": f"Bearer {manufacturer_user.access_token}"}
    quote_payload = {
        "order_id": order_id,
        "price_total": 1100.0,
        "delivery_days": 28,
    }
    resp = await http_client.post("/api/v1/quotes/", json=quote_payload, headers=headers_manu)
    assert resp.status_code in (200, 201), resp.text
    quote_id = resp.json()["id"]

    # --- 4. client accepts the quote ---
    resp = await http_client.post(f"/api/v1/quotes/{quote_id}/accept", headers=headers_client)
    assert resp.status_code == 200, resp.text

    # --- 5. client processes payment (stubbed/live depending on env) ---
    payment_payload = {
        "order_id": order_id,
        "quote_id": quote_id,
        "payment_method_id": "pm_card_visa",  # test payment method token; ignored in stub mode
    }
    resp = await http_client.post(
        "/api/v1/payments/process-order-payment", json=payment_payload, headers=headers_client
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["status"] in {"succeeded", "processing", "requires_action"}

    # sanity: manufacturer should have a notification of quote acceptance
    resp = await http_client.get(
        "/api/v1/notifications", headers=headers_manu
    )
    assert resp.status_code == 200, resp.text
    notifications = resp.json()
    assert any(
        n.get("type") == "quote_accepted" and n.get("quote_id") == quote_id for n in notifications
    ) 
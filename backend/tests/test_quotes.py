import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.models.user import User
from app.models.order import Order, OrderStatus
from app.models.quote import Quote
from app.models.producer import Manufacturer


def test_create_quote_success(
    test_client: TestClient,
    db_session: Session,
    manufacturer_auth_headers: dict,
    client_auth_headers: dict
):
    """Test successful quote creation by manufacturer"""
    # Create a client user who owns an order
    client_user = db_session.query(User).filter(User.email == "client@test.com").first()
    
    # Create an order
    order = Order(
        title="Test Order for Quoting",
        description="A test order.",
        client_id=client_user.id,
        status=OrderStatus.ACTIVE,
        quantity=100,
        delivery_deadline=datetime.utcnow() + timedelta(days=30)
    )
    db_session.add(order)
    db_session.commit()
    db_session.refresh(order)
    
    # Create quote data
    quote_data = {
        "order_id": order.id,
        "price": 1250.75,
        "delivery_days": 10,
        "description": "This is our best offer.",
        "valid_until": (datetime.utcnow() + timedelta(days=30)).isoformat()
    }
    
    # Submit quote as manufacturer
    response = test_client.post("/api/v1/quotes/", json=quote_data, headers=manufacturer_auth_headers)
    
    # Check response
    assert response.status_code == 201, f"Failed: {response.text}"
    data = response.json()
    assert data["order_id"] == order.id
    # The API returns the total price including 23% VAT
    expected_total = 1250.75 * 1.23  # Price + 23% tax
    assert abs(float(data["price"]) - expected_total) < 0.01  # Allow small rounding difference


def test_create_quote_by_client_fails(
    test_client: TestClient, 
    client_auth_headers: dict, 
    db_session: Session
):
    """Test that clients cannot create quotes"""
    # Create an order owned by the client
    client_user = db_session.query(User).filter(User.email == "client@test.com").first()
    order = Order(
        title="Client Order",
        description="An order to test permissions.",
        client_id=client_user.id,
        status=OrderStatus.ACTIVE,
        quantity=10,
        delivery_deadline=datetime.utcnow() + timedelta(days=30)
    )
    db_session.add(order)
    db_session.commit()
    
    # Try to create a quote as client
    quote_data = {
        "order_id": order.id,
        "price": 100,
        "delivery_days": 1,
        "description": "This should fail",
        "valid_until": (datetime.utcnow() + timedelta(days=1)).isoformat()
    }
    
    response = test_client.post("/api/v1/quotes/", json=quote_data, headers=client_auth_headers)
    
    # Should be forbidden
    assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"


def test_get_quotes_for_order(
    test_client: TestClient,
    db_session: Session,
    manufacturer_auth_headers: dict,
    client_auth_headers: dict
):
    """Test retrieving quotes for an order"""
    # Create test data
    manufacturer = db_session.query(Manufacturer).join(User).filter(User.email == "manufacturer@test.com").first()
    client_user = db_session.query(User).filter(User.email == "client@test.com").first()
    
    order = Order(
        title="Order with Quotes",
        description="Test order",
        client_id=client_user.id,
        status=OrderStatus.ACTIVE,
        quantity=50,
        delivery_deadline=datetime.utcnow() + timedelta(days=20)
    )
    db_session.add(order)
    db_session.commit()
    
    # Create a quote via API
    quote_data = {
        "order_id": order.id,
        "price": 500,
        "delivery_days": 5,
        "description": "Test quote",
        "valid_until": (datetime.utcnow() + timedelta(days=7)).isoformat()
    }
    
    create_response = test_client.post("/api/v1/quotes/", json=quote_data, headers=manufacturer_auth_headers)
    assert create_response.status_code == 201
    
    # Get quotes for the order
    response = test_client.get(f"/api/v1/quotes/?order_id={order.id}", headers=manufacturer_auth_headers)
    assert response.status_code == 200
    
    quotes = response.json()
    assert isinstance(quotes, list)
    assert len(quotes) >= 1
    assert quotes[0]["order_id"] == order.id 
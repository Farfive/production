"""
Database model tests
"""
import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.order import Order
from app.models.quote import Quote
from app.models.payment import Payment
from app.models.producer import Producer
from app.models.message import Message
from tests.factories import (
    UserFactory, BuyerFactory, ManufacturerFactory,
    OrderFactory, QuoteFactory, PaymentFactory,
    ProducerFactory, MessageFactory
)


class TestUserModel:
    """Test cases for User model"""

    @pytest.mark.database
    def test_create_user_success(self, db_session: Session):
        """Test successful user creation"""
        # Arrange
        user_data = {
            "email": "test@example.com",
            "password_hash": "hashed_password",
            "first_name": "John",
            "last_name": "Doe",
            "company_name": "Test Company",
            "role": "buyer"
        }

        # Act
        user = User(**user_data)
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        # Assert
        assert user.id is not None
        assert user.email == user_data["email"]
        assert user.full_name == "John Doe"
        assert user.is_active is True
        assert user.is_verified is False
        assert user.created_at is not None

    @pytest.mark.database
    def test_user_email_unique_constraint(self, db_session: Session):
        """Test email uniqueness constraint"""
        # Arrange
        email = "duplicate@example.com"
        user1 = User(email=email, password_hash="hash1", first_name="User", last_name="One", role="buyer")
        user2 = User(email=email, password_hash="hash2", first_name="User", last_name="Two", role="manufacturer")

        # Act & Assert
        db_session.add(user1)
        db_session.commit()

        db_session.add(user2)
        with pytest.raises(IntegrityError):
            db_session.commit()

    @pytest.mark.database
    def test_user_factory_creation(self, db_session: Session):
        """Test user creation using factory"""
        # Act
        user = UserFactory()
        db_session.add(user)
        db_session.commit()

        # Assert
        assert user.id is not None
        assert user.email is not None
        assert user.role in ["buyer", "manufacturer"]

    @pytest.mark.database
    def test_buyer_factory_creation(self, db_session: Session):
        """Test buyer creation using factory"""
        # Act
        buyer = BuyerFactory()
        db_session.add(buyer)
        db_session.commit()

        # Assert
        assert buyer.role == "buyer"
        assert buyer.id is not None

    @pytest.mark.database
    def test_manufacturer_factory_creation(self, db_session: Session):
        """Test manufacturer creation using factory"""
        # Act
        manufacturer = ManufacturerFactory()
        db_session.add(manufacturer)
        db_session.commit()

        # Assert
        assert manufacturer.role == "manufacturer"
        assert manufacturer.id is not None

    @pytest.mark.database
    def test_user_relationships(self, db_session: Session):
        """Test user model relationships"""
        # Arrange
        buyer = BuyerFactory()
        manufacturer = ManufacturerFactory()
        db_session.add_all([buyer, manufacturer])
        db_session.commit()

        # Create orders for buyer
        order1 = OrderFactory(buyer=buyer)
        order2 = OrderFactory(buyer=buyer)
        db_session.add_all([order1, order2])
        db_session.commit()

        # Assert
        assert len(buyer.orders) == 2
        assert order1 in buyer.orders
        assert order2 in buyer.orders

    @pytest.mark.database
    def test_user_soft_delete(self, db_session: Session):
        """Test user soft delete functionality"""
        # Arrange
        user = UserFactory()
        db_session.add(user)
        db_session.commit()
        user_id = user.id

        # Act
        user.is_active = False
        db_session.commit()

        # Assert
        inactive_user = db_session.query(User).filter(User.id == user_id).first()
        assert inactive_user.is_active is False


class TestOrderModel:
    """Test cases for Order model"""

    @pytest.mark.database
    def test_create_order_success(self, db_session: Session):
        """Test successful order creation"""
        # Arrange
        buyer = BuyerFactory()
        db_session.add(buyer)
        db_session.commit()

        order_data = {
            "buyer_id": buyer.id,
            "title": "Test Order",
            "description": "Test order description",
            "quantity": 100,
            "material": "Steel",
            "deadline": datetime.utcnow() + timedelta(days=30),
            "budget_min": Decimal("1000.00"),
            "budget_max": Decimal("5000.00"),
            "status": "draft"
        }

        # Act
        order = Order(**order_data)
        db_session.add(order)
        db_session.commit()
        db_session.refresh(order)

        # Assert
        assert order.id is not None
        assert order.buyer_id == buyer.id
        assert order.title == "Test Order"
        assert order.status == "draft"
        assert order.created_at is not None

    @pytest.mark.database
    def test_order_factory_creation(self, db_session: Session):
        """Test order creation using factory"""
        # Act
        order = OrderFactory()
        db_session.add(order)
        db_session.commit()

        # Assert
        assert order.id is not None
        assert order.buyer is not None
        assert order.title is not None
        assert order.quantity > 0

    @pytest.mark.database
    def test_order_buyer_relationship(self, db_session: Session):
        """Test order-buyer relationship"""
        # Arrange
        buyer = BuyerFactory()
        order = OrderFactory(buyer=buyer)
        db_session.add_all([buyer, order])
        db_session.commit()

        # Assert
        assert order.buyer == buyer
        assert order in buyer.orders

    @pytest.mark.database
    def test_order_status_transitions(self, db_session: Session):
        """Test order status transitions"""
        # Arrange
        order = OrderFactory(status="draft")
        db_session.add(order)
        db_session.commit()

        # Act & Assert
        valid_transitions = ["published", "cancelled"]
        for status in valid_transitions:
            order.status = status
            db_session.commit()
            assert order.status == status

    @pytest.mark.database
    def test_order_budget_validation(self, db_session: Session):
        """Test order budget validation"""
        # Arrange
        buyer = BuyerFactory()
        db_session.add(buyer)
        db_session.commit()

        # Act & Assert - budget_max should be greater than budget_min
        with pytest.raises(ValueError):
            order = Order(
                buyer_id=buyer.id,
                title="Test Order",
                budget_min=Decimal("5000.00"),
                budget_max=Decimal("1000.00")  # Invalid: max < min
            )
            db_session.add(order)
            db_session.commit()


class TestQuoteModel:
    """Test cases for Quote model"""

    @pytest.mark.database
    def test_create_quote_success(self, db_session: Session):
        """Test successful quote creation"""
        # Arrange
        order = OrderFactory()
        manufacturer = ProducerFactory()
        db_session.add_all([order, manufacturer])
        db_session.commit()

        quote_data = {
            "order_id": order.id,
            "manufacturer_id": manufacturer.id,
            "price": Decimal("2500.00"),
            "delivery_time": 14,
            "message": "We can deliver this order",
            "status": "pending"
        }

        # Act
        quote = Quote(**quote_data)
        db_session.add(quote)
        db_session.commit()
        db_session.refresh(quote)

        # Assert
        assert quote.id is not None
        assert quote.order_id == order.id
        assert quote.manufacturer_id == manufacturer.id
        assert quote.price == Decimal("2500.00")
        assert quote.status == "pending"

    @pytest.mark.database
    def test_quote_factory_creation(self, db_session: Session):
        """Test quote creation using factory"""
        # Act
        quote = QuoteFactory()
        db_session.add(quote)
        db_session.commit()

        # Assert
        assert quote.id is not None
        assert quote.order is not None
        assert quote.manufacturer is not None
        assert quote.price > 0

    @pytest.mark.database
    def test_quote_relationships(self, db_session: Session):
        """Test quote model relationships"""
        # Arrange
        order = OrderFactory()
        manufacturer = ProducerFactory()
        quote = QuoteFactory(order=order, manufacturer=manufacturer)
        db_session.add_all([order, manufacturer, quote])
        db_session.commit()

        # Assert
        assert quote.order == order
        assert quote.manufacturer == manufacturer
        assert quote in order.quotes

    @pytest.mark.database
    def test_quote_expiration(self, db_session: Session):
        """Test quote expiration logic"""
        # Arrange
        expired_quote = QuoteFactory(
            valid_until=datetime.utcnow() - timedelta(days=1),
            status="pending"
        )
        db_session.add(expired_quote)
        db_session.commit()

        # Act
        is_expired = expired_quote.valid_until < datetime.utcnow()

        # Assert
        assert is_expired is True

    @pytest.mark.database
    def test_multiple_quotes_per_order(self, db_session: Session):
        """Test multiple quotes for single order"""
        # Arrange
        order = OrderFactory()
        manufacturer1 = ProducerFactory()
        manufacturer2 = ProducerFactory()
        manufacturer3 = ProducerFactory()
        
        db_session.add_all([order, manufacturer1, manufacturer2, manufacturer3])
        db_session.commit()

        # Act
        quote1 = QuoteFactory(order=order, manufacturer=manufacturer1)
        quote2 = QuoteFactory(order=order, manufacturer=manufacturer2)
        quote3 = QuoteFactory(order=order, manufacturer=manufacturer3)
        
        db_session.add_all([quote1, quote2, quote3])
        db_session.commit()

        # Assert
        assert len(order.quotes) == 3
        assert quote1 in order.quotes
        assert quote2 in order.quotes
        assert quote3 in order.quotes


class TestPaymentModel:
    """Test cases for Payment model"""

    @pytest.mark.database
    def test_create_payment_success(self, db_session: Session):
        """Test successful payment creation"""
        # Arrange
        order = OrderFactory()
        quote = QuoteFactory(order=order)
        db_session.add_all([order, quote])
        db_session.commit()

        payment_data = {
            "order_id": order.id,
            "quote_id": quote.id,
            "stripe_payment_intent_id": "pi_test123",
            "amount": Decimal("2500.00"),
            "currency": "USD",
            "status": "pending"
        }

        # Act
        payment = Payment(**payment_data)
        db_session.add(payment)
        db_session.commit()
        db_session.refresh(payment)

        # Assert
        assert payment.id is not None
        assert payment.order_id == order.id
        assert payment.quote_id == quote.id
        assert payment.amount == Decimal("2500.00")
        assert payment.currency == "USD"

    @pytest.mark.database
    def test_payment_factory_creation(self, db_session: Session):
        """Test payment creation using factory"""
        # Act
        payment = PaymentFactory()
        db_session.add(payment)
        db_session.commit()

        # Assert
        assert payment.id is not None
        assert payment.order is not None
        assert payment.quote is not None
        assert payment.amount > 0

    @pytest.mark.database
    def test_payment_relationships(self, db_session: Session):
        """Test payment model relationships"""
        # Arrange
        order = OrderFactory()
        quote = QuoteFactory(order=order)
        payment = PaymentFactory(order=order, quote=quote)
        db_session.add_all([order, quote, payment])
        db_session.commit()

        # Assert
        assert payment.order == order
        assert payment.quote == quote

    @pytest.mark.database
    def test_payment_status_updates(self, db_session: Session):
        """Test payment status updates"""
        # Arrange
        payment = PaymentFactory(status="pending")
        db_session.add(payment)
        db_session.commit()

        # Act & Assert
        valid_statuses = ["processing", "succeeded", "failed", "cancelled"]
        for status in valid_statuses:
            payment.status = status
            db_session.commit()
            assert payment.status == status

    @pytest.mark.database
    def test_payment_amount_precision(self, db_session: Session):
        """Test payment amount decimal precision"""
        # Arrange
        payment = PaymentFactory(amount=Decimal("1234.56"))
        db_session.add(payment)
        db_session.commit()

        # Assert
        assert payment.amount == Decimal("1234.56")
        assert str(payment.amount) == "1234.56"


class TestProducerModel:
    """Test cases for Producer model"""

    @pytest.mark.database
    def test_create_producer_success(self, db_session: Session):
        """Test successful producer creation"""
        # Arrange
        user = ManufacturerFactory()
        db_session.add(user)
        db_session.commit()

        producer_data = {
            "user_id": user.id,
            "company_name": "Test Manufacturing Co",
            "description": "We manufacture quality products",
            "capabilities": ["CNC Machining", "3D Printing"],
            "certifications": ["ISO 9001"],
            "location": {
                "address": "123 Manufacturing St",
                "city": "Industrial City",
                "state": "CA",
                "country": "USA"
            }
        }

        # Act
        producer = Producer(**producer_data)
        db_session.add(producer)
        db_session.commit()
        db_session.refresh(producer)

        # Assert
        assert producer.id is not None
        assert producer.user_id == user.id
        assert producer.company_name == "Test Manufacturing Co"
        assert "CNC Machining" in producer.capabilities
        assert "ISO 9001" in producer.certifications

    @pytest.mark.database
    def test_producer_factory_creation(self, db_session: Session):
        """Test producer creation using factory"""
        # Act
        producer = ProducerFactory()
        db_session.add(producer)
        db_session.commit()

        # Assert
        assert producer.id is not None
        assert producer.user is not None
        assert producer.company_name is not None
        assert len(producer.capabilities) > 0

    @pytest.mark.database
    def test_producer_user_relationship(self, db_session: Session):
        """Test producer-user relationship"""
        # Arrange
        user = ManufacturerFactory()
        producer = ProducerFactory(user=user)
        db_session.add_all([user, producer])
        db_session.commit()

        # Assert
        assert producer.user == user
        assert user.producer == producer

    @pytest.mark.database
    def test_producer_rating_calculation(self, db_session: Session):
        """Test producer rating calculation"""
        # Arrange
        producer = ProducerFactory(rating=Decimal("4.5"))
        db_session.add(producer)
        db_session.commit()

        # Assert
        assert producer.rating == Decimal("4.5")
        assert 0 <= producer.rating <= 5


class TestMessageModel:
    """Test cases for Message model"""

    @pytest.mark.database
    def test_create_message_success(self, db_session: Session):
        """Test successful message creation"""
        # Arrange
        sender = BuyerFactory()
        recipient = ManufacturerFactory()
        order = OrderFactory(buyer=sender)
        db_session.add_all([sender, recipient, order])
        db_session.commit()

        message_data = {
            "sender_id": sender.id,
            "recipient_id": recipient.id,
            "order_id": order.id,
            "subject": "Question about order",
            "content": "I have a question about the specifications",
            "message_type": "inquiry"
        }

        # Act
        message = Message(**message_data)
        db_session.add(message)
        db_session.commit()
        db_session.refresh(message)

        # Assert
        assert message.id is not None
        assert message.sender_id == sender.id
        assert message.recipient_id == recipient.id
        assert message.subject == "Question about order"
        assert message.is_read is False

    @pytest.mark.database
    def test_message_factory_creation(self, db_session: Session):
        """Test message creation using factory"""
        # Act
        message = MessageFactory()
        db_session.add(message)
        db_session.commit()

        # Assert
        assert message.id is not None
        assert message.sender is not None
        assert message.recipient is not None
        assert message.content is not None

    @pytest.mark.database
    def test_message_relationships(self, db_session: Session):
        """Test message model relationships"""
        # Arrange
        sender = BuyerFactory()
        recipient = ManufacturerFactory()
        order = OrderFactory()
        message = MessageFactory(sender=sender, recipient=recipient, order=order)
        db_session.add_all([sender, recipient, order, message])
        db_session.commit()

        # Assert
        assert message.sender == sender
        assert message.recipient == recipient
        assert message.order == order

    @pytest.mark.database
    def test_message_read_status(self, db_session: Session):
        """Test message read status functionality"""
        # Arrange
        message = MessageFactory(is_read=False)
        db_session.add(message)
        db_session.commit()

        # Act
        message.is_read = True
        db_session.commit()

        # Assert
        assert message.is_read is True


class TestModelConstraints:
    """Test database constraints and validations"""

    @pytest.mark.database
    def test_foreign_key_constraints(self, db_session: Session):
        """Test foreign key constraints"""
        # Act & Assert - Should raise error for invalid foreign key
        with pytest.raises(IntegrityError):
            order = Order(
                buyer_id=99999,  # Non-existent buyer
                title="Test Order",
                quantity=1,
                material="Steel"
            )
            db_session.add(order)
            db_session.commit()

    @pytest.mark.database
    def test_not_null_constraints(self, db_session: Session):
        """Test NOT NULL constraints"""
        # Act & Assert - Should raise error for missing required fields
        with pytest.raises(IntegrityError):
            user = User()  # Missing required fields
            db_session.add(user)
            db_session.commit()

    @pytest.mark.database
    def test_check_constraints(self, db_session: Session):
        """Test CHECK constraints"""
        # This would test custom check constraints if any are defined
        # For example, ensuring positive quantities, valid status values, etc.
        pass

    @pytest.mark.database
    def test_cascade_deletes(self, db_session: Session):
        """Test cascade delete behavior"""
        # Arrange
        buyer = BuyerFactory()
        order = OrderFactory(buyer=buyer)
        quote = QuoteFactory(order=order)
        db_session.add_all([buyer, order, quote])
        db_session.commit()

        order_id = order.id
        quote_id = quote.id

        # Act - Delete order
        db_session.delete(order)
        db_session.commit()

        # Assert - Quote should be deleted due to cascade
        deleted_quote = db_session.query(Quote).filter(Quote.id == quote_id).first()
        assert deleted_quote is None


class TestDatabasePerformance:
    """Test database performance and optimization"""

    @pytest.mark.database
    @pytest.mark.slow
    def test_bulk_insert_performance(self, db_session: Session):
        """Test bulk insert performance"""
        # Arrange
        users = [UserFactory.build() for _ in range(1000)]

        # Act
        start_time = datetime.utcnow()
        db_session.bulk_save_objects(users)
        db_session.commit()
        end_time = datetime.utcnow()

        # Assert
        duration = (end_time - start_time).total_seconds()
        assert duration < 5.0  # Should complete within 5 seconds
        
        # Verify all users were inserted
        user_count = db_session.query(User).count()
        assert user_count >= 1000

    @pytest.mark.database
    @pytest.mark.slow
    def test_query_performance(self, db_session: Session):
        """Test query performance with indexes"""
        # Arrange - Create test data
        users = [UserFactory() for _ in range(100)]
        orders = [OrderFactory() for _ in range(500)]
        db_session.add_all(users + orders)
        db_session.commit()

        # Act - Test indexed query performance
        start_time = datetime.utcnow()
        results = db_session.query(Order).filter(Order.status == "published").all()
        end_time = datetime.utcnow()

        # Assert
        duration = (end_time - start_time).total_seconds()
        assert duration < 1.0  # Should complete within 1 second
        assert len(results) >= 0

    @pytest.mark.database
    def test_connection_pooling(self, db_session: Session):
        """Test database connection pooling"""
        # This test would verify connection pool behavior
        # For now, we'll just test that we can create multiple sessions
        sessions = []
        try:
            for _ in range(10):
                session = db_session.bind.connect()
                sessions.append(session)
            
            # All connections should be valid
            assert len(sessions) == 10
        finally:
            for session in sessions:
                session.close() 
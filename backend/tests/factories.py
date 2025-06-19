"""
Factory classes for generating test data
"""
import factory
from factory import fuzzy
from faker import Faker
from datetime import datetime, timedelta
from decimal import Decimal

from app.models.user import User
from app.models.order import Order
from app.models.quote import Quote
from app.models.payment import Payment
from app.models.producer import Producer
from app.models.message import Message

fake = Faker()


class UserFactory(factory.Factory):
    """Factory for User model"""
    class Meta:
        model = User

    email = factory.Sequence(lambda n: f"testuser{n}@staging.manufacturing-platform.com")
    password_hash = factory.LazyFunction(lambda: "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/kbx.N8jIu")  # "password"
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    company_name = factory.Faker('company')
    phone = factory.Faker('phone_number')
    role = fuzzy.FuzzyChoice(['buyer', 'manufacturer'])
    is_active = True
    is_verified = True
    created_at = factory.LazyFunction(datetime.utcnow)
    updated_at = factory.LazyFunction(datetime.utcnow)


class BuyerFactory(UserFactory):
    """Factory for Buyer users"""
    role = 'buyer'


class ManufacturerFactory(UserFactory):
    """Factory for Manufacturer users"""
    role = 'manufacturer'


class ProducerFactory(factory.Factory):
    """Factory for Producer model"""
    class Meta:
        model = Producer

    user = factory.SubFactory(ManufacturerFactory)
    company_name = factory.Faker('company')
    description = factory.Faker('text', max_nb_chars=500)
    capabilities = factory.LazyFunction(
        lambda: fake.random_elements(
            elements=['CNC Machining', '3D Printing', 'Injection Molding', 'Sheet Metal', 'Welding'],
            length=fake.random_int(min=1, max=3),
            unique=True
        )
    )
    certifications = factory.LazyFunction(
        lambda: fake.random_elements(
            elements=['ISO 9001', 'AS9100', 'ISO 14001', 'IATF 16949'],
            length=fake.random_int(min=0, max=2),
            unique=True
        )
    )
    location = factory.LazyFunction(
        lambda: {
            "address": fake.address(),
            "city": fake.city(),
            "state": fake.state(),
            "country": fake.country(),
            "postal_code": fake.postcode(),
            "latitude": float(fake.latitude()),
            "longitude": float(fake.longitude())
        }
    )
    contact_info = factory.LazyFunction(
        lambda: {
            "email": fake.email(),
            "phone": fake.phone_number(),
            "website": fake.url()
        }
    )
    rating = fuzzy.FuzzyDecimal(3.0, 5.0, precision=1)
    total_orders = fuzzy.FuzzyInteger(0, 100)
    is_verified = True
    is_active = True
    created_at = factory.LazyFunction(datetime.utcnow)
    updated_at = factory.LazyFunction(datetime.utcnow)


class OrderFactory(factory.Factory):
    """Factory for Order model"""
    class Meta:
        model = Order

    buyer = factory.SubFactory(BuyerFactory)
    title = factory.Faker('catch_phrase')
    description = factory.Faker('text', max_nb_chars=1000)
    quantity = fuzzy.FuzzyInteger(1, 1000)
    material = fuzzy.FuzzyChoice(['Steel', 'Aluminum', 'Plastic', 'Titanium', 'Copper'])
    deadline = factory.LazyFunction(lambda: datetime.utcnow() + timedelta(days=fake.random_int(min=7, max=60)))
    budget_min = fuzzy.FuzzyDecimal(100, 5000)
    budget_max = fuzzy.FuzzyDecimal(5000, 50000)
    specifications = factory.LazyFunction(
        lambda: {
            "dimensions": f"{fake.random_int(1, 100)}x{fake.random_int(1, 100)}x{fake.random_int(1, 100)}mm",
            "tolerance": "±0.1mm",
            "finish": fake.random_element(elements=("Anodized", "Powder Coated", "Raw", "Polished")),
            "material_grade": fake.random_element(elements=("Grade A", "Grade B", "Commercial Grade"))
        }
    )
    attachments = factory.LazyFunction(
        lambda: [
            {
                "filename": f"{fake.word()}.pdf",
                "url": fake.url(),
                "size": fake.random_int(min=1024, max=10485760)
            }
        ] if fake.boolean() else []
    )
    status = fuzzy.FuzzyChoice(['draft', 'published', 'in_progress', 'completed', 'cancelled'])
    priority = fuzzy.FuzzyChoice(['low', 'medium', 'high', 'urgent'])
    category = fuzzy.FuzzyChoice(['machining', 'fabrication', 'assembly', 'finishing'])
    location_preference = factory.LazyFunction(
        lambda: {
            "country": fake.country(),
            "max_distance": fake.random_int(min=50, max=500)
        } if fake.boolean() else None
    )
    created_at = factory.LazyFunction(datetime.utcnow)
    updated_at = factory.LazyFunction(datetime.utcnow)


class QuoteFactory(factory.Factory):
    """Factory for Quote model"""
    class Meta:
        model = Quote

    order = factory.SubFactory(OrderFactory)
    manufacturer = factory.SubFactory(ProducerFactory)
    price = fuzzy.FuzzyDecimal(500, 25000)
    delivery_time = fuzzy.FuzzyInteger(7, 45)
    message = factory.Faker('text', max_nb_chars=500)
    terms = factory.Faker('text', max_nb_chars=200)
    status = fuzzy.FuzzyChoice(['pending', 'accepted', 'rejected', 'expired'])
    valid_until = factory.LazyFunction(lambda: datetime.utcnow() + timedelta(days=7))
    breakdown = factory.LazyFunction(
        lambda: {
            "materials": fake.random_int(min=100, max=5000),
            "labor": fake.random_int(min=200, max=8000),
            "overhead": fake.random_int(min=50, max=1000),
            "profit_margin": fake.random_int(min=10, max=30)
        }
    )
    attachments = factory.LazyFunction(
        lambda: [
            {
                "filename": f"quote_{fake.word()}.pdf",
                "url": fake.url(),
                "size": fake.random_int(min=1024, max=5242880)
            }
        ] if fake.boolean() else []
    )
    created_at = factory.LazyFunction(datetime.utcnow)
    updated_at = factory.LazyFunction(datetime.utcnow)


class PaymentFactory(factory.Factory):
    """Factory for Payment model"""
    class Meta:
        model = Payment

    order = factory.SubFactory(OrderFactory)
    quote = factory.SubFactory(QuoteFactory)
    stripe_payment_intent_id = factory.Sequence(lambda n: f"pi_test_{n}")
    amount = fuzzy.FuzzyDecimal(500, 25000)
    currency = fuzzy.FuzzyChoice(['USD', 'EUR', 'GBP'])
    status = fuzzy.FuzzyChoice(['pending', 'processing', 'succeeded', 'failed', 'cancelled'])
    payment_method = fuzzy.FuzzyChoice(['card', 'bank_transfer', 'wire'])
    metadata = factory.LazyFunction(
        lambda: {
            "order_id": fake.random_int(min=1, max=1000),
            "quote_id": fake.random_int(min=1, max=1000),
            "customer_notes": fake.text(max_nb_chars=100)
        }
    )
    fees = factory.LazyFunction(
        lambda: {
            "stripe_fee": fake.random_int(min=10, max=100),
            "platform_fee": fake.random_int(min=20, max=200)
        }
    )
    created_at = factory.LazyFunction(datetime.utcnow)
    updated_at = factory.LazyFunction(datetime.utcnow)


class MessageFactory(factory.Factory):
    """Factory for Message model"""
    class Meta:
        model = Message

    sender = factory.SubFactory(UserFactory)
    recipient = factory.SubFactory(UserFactory)
    order = factory.SubFactory(OrderFactory)
    subject = factory.Faker('sentence', nb_words=6)
    content = factory.Faker('text', max_nb_chars=1000)
    message_type = fuzzy.FuzzyChoice(['inquiry', 'quote_discussion', 'order_update', 'general'])
    is_read = False
    attachments = factory.LazyFunction(
        lambda: [
            {
                "filename": f"{fake.word()}.{fake.random_element(elements=('pdf', 'jpg', 'png', 'doc'))}",
                "url": fake.url(),
                "size": fake.random_int(min=1024, max=10485760)
            }
        ] if fake.boolean(chance_of_getting_true=30) else []
    )
    created_at = factory.LazyFunction(datetime.utcnow)
    updated_at = factory.LazyFunction(datetime.utcnow)


# Batch factories for creating multiple instances
class BatchUserFactory:
    """Factory for creating multiple users"""
    
    @staticmethod
    def create_buyers(count: int = 10):
        """Create multiple buyer users"""
        return [BuyerFactory() for _ in range(count)]
    
    @staticmethod
    def create_manufacturers(count: int = 10):
        """Create multiple manufacturer users"""
        return [ManufacturerFactory() for _ in range(count)]
    
    @staticmethod
    def create_mixed_users(buyer_count: int = 5, manufacturer_count: int = 5):
        """Create mixed user types"""
        buyers = [BuyerFactory() for _ in range(buyer_count)]
        manufacturers = [ManufacturerFactory() for _ in range(manufacturer_count)]
        return buyers + manufacturers


class BatchOrderFactory:
    """Factory for creating multiple orders"""
    
    @staticmethod
    def create_orders_with_quotes(order_count: int = 5, quotes_per_order: int = 3):
        """Create orders with associated quotes"""
        orders = []
        for _ in range(order_count):
            order = OrderFactory()
            quotes = [QuoteFactory(order=order) for _ in range(quotes_per_order)]
            order.quotes = quotes
            orders.append(order)
        return orders
    
    @staticmethod
    def create_orders_by_status(status_counts: dict):
        """Create orders with specific status distribution"""
        orders = []
        for status, count in status_counts.items():
            orders.extend([OrderFactory(status=status) for _ in range(count)])
        return orders


# Specialized factories for testing edge cases
class EdgeCaseFactory:
    """Factory for creating edge case test data"""
    
    @staticmethod
    def create_expired_quote():
        """Create an expired quote"""
        return QuoteFactory(
            valid_until=datetime.utcnow() - timedelta(days=1),
            status='expired'
        )
    
    @staticmethod
    def create_urgent_order():
        """Create an urgent order with tight deadline"""
        return OrderFactory(
            priority='urgent',
            deadline=datetime.utcnow() + timedelta(days=2),
            status='published'
        )
    
    @staticmethod
    def create_high_value_order():
        """Create a high-value order"""
        return OrderFactory(
            budget_min=Decimal('50000'),
            budget_max=Decimal('500000'),
            quantity=10000,
            priority='high'
        )
    
    @staticmethod
    def create_failed_payment():
        """Create a failed payment"""
        return PaymentFactory(
            status='failed',
            metadata={
                "error_code": "card_declined",
                "error_message": "Your card was declined."
            }
        )


# Performance testing factories
class PerformanceTestFactory:
    """Factory for creating performance test data"""
    
    @staticmethod
    def create_large_dataset():
        """Create a large dataset for performance testing"""
        return {
            'users': BatchUserFactory.create_mixed_users(50, 50),
            'orders': [OrderFactory() for _ in range(200)],
            'quotes': [QuoteFactory() for _ in range(600)],
            'payments': [PaymentFactory() for _ in range(100)],
            'messages': [MessageFactory() for _ in range(1000)]
        } 
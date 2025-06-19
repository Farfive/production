import pytest
import stripe
from unittest.mock import Mock, patch
from decimal import Decimal
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.services.payment import MultiRegionStripeService, PaymentError
from app.services.subscription_service import SubscriptionService
from app.services.invoice_service import InvoiceService
from app.models.payment import (
    Transaction, TransactionStatus, TransactionType, PaymentRegion,
    PaymentMethod, StripeConnectAccount, ConnectAccountType,
    Subscription, SubscriptionStatus, Invoice
)
from app.models.user import User
from app.models.order import Order
from app.models.quote import Quote


class TestMultiRegionStripeService:
    """Test multinational Stripe service functionality"""
    
    @pytest.fixture
    def stripe_service(self):
        return MultiRegionStripeService()
    
    @pytest.fixture
    def mock_user(self):
        user = Mock(spec=User)
        user.id = 1
        user.email = "test@example.com"
        user.full_name = "Test User"
        user.country = "US"
        return user
    
    @pytest.fixture
    def mock_manufacturer(self):
        manufacturer = Mock()
        manufacturer.id = 1
        manufacturer.email = "manufacturer@example.com"
        manufacturer.business_name = "Test Manufacturing"
        return manufacturer
    
    @pytest.fixture
    def mock_order(self):
        order = Mock(spec=Order)
        order.id = 1
        order.title = "Test Manufacturing Order"
        order.total_amount = Decimal('1000.00')
        order.currency = "USD"
        return order
    
    @pytest.fixture
    def mock_quote(self):
        quote = Mock(spec=Quote)
        quote.id = 1
        quote.price_total = Decimal('1000.00')
        quote.currency = "USD"
        return quote
    
    def test_detect_region(self, stripe_service):
        """Test region detection from country codes"""
        assert stripe_service.detect_region("US") == PaymentRegion.US
        assert stripe_service.detect_region("CA") == PaymentRegion.US
        assert stripe_service.detect_region("GB") == PaymentRegion.UK
        assert stripe_service.detect_region("DE") == PaymentRegion.EU
        assert stripe_service.detect_region("FR") == PaymentRegion.EU
        assert stripe_service.detect_region("XY") == PaymentRegion.OTHER
    
    def test_exchange_rate_same_currency(self, stripe_service):
        """Test exchange rate for same currency"""
        rate = stripe_service.get_exchange_rate("USD", "USD")
        assert rate == Decimal('1.0')
    
    def test_currency_conversion_same_currency(self, stripe_service):
        """Test currency conversion for same currency"""
        amount = Decimal('100.00')
        converted = stripe_service.convert_currency(amount, "USD", "USD")
        assert converted == amount
    
    def test_calculate_fees_us_card(self, stripe_service):
        """Test fee calculation for US card payment"""
        amount = Decimal('100.00')
        fees = stripe_service.calculate_fees(
            amount, PaymentRegion.US, PaymentMethod.CARD, is_cross_border=False
        )
        
        expected_stripe_fee = (amount * Decimal('0.029')) + Decimal('0.30')
        assert fees['stripe_fee'] == expected_stripe_fee
        assert fees['cross_border_fee'] == Decimal('0.0')
        assert fees['total_fees'] == expected_stripe_fee
    
    def test_calculate_fees_cross_border(self, stripe_service):
        """Test fee calculation with cross-border charges"""
        amount = Decimal('100.00')
        fees = stripe_service.calculate_fees(
            amount, PaymentRegion.US, PaymentMethod.CARD, is_cross_border=True
        )
        
        expected_cross_border = amount * Decimal('0.015')
        assert fees['cross_border_fee'] == expected_cross_border
        assert fees['total_fees'] > fees['stripe_fee']
    
    def test_calculate_tax_us(self, stripe_service):
        """Test tax calculation for US"""
        amount = Decimal('100.00')
        tax_info = stripe_service.calculate_tax(
            amount, PaymentRegion.US, "US", tax_included=False
        )
        
        assert tax_info['tax_rate'] == Decimal('0.0875')
        assert tax_info['net_amount'] == amount
        assert tax_info['tax_amount'] == amount * Decimal('0.0875')
    
    def test_calculate_tax_eu_included(self, stripe_service):
        """Test tax calculation for EU with tax included"""
        amount = Decimal('121.00')  # 100 + 21% VAT
        tax_info = stripe_service.calculate_tax(
            amount, PaymentRegion.EU, "DE", tax_included=True
        )
        
        assert tax_info['tax_rate'] == Decimal('0.19')  # Germany VAT
        # Tax amount should be approximately 19.50 (121 / 1.19 * 0.19)
        assert abs(tax_info['tax_amount'] - Decimal('19.33')) < Decimal('0.01')
    
    @patch('stripe.PaymentIntent.create')
    async def test_create_payment_intent_success(
        self, mock_stripe_create, stripe_service, mock_user, mock_manufacturer, 
        mock_order, mock_quote, db_session
    ):
        """Test successful payment intent creation"""
        
        # Mock Stripe response
        mock_payment_intent = Mock()
        mock_payment_intent.id = "pi_test123"
        mock_payment_intent.client_secret = "pi_test123_secret"
        mock_stripe_create.return_value = mock_payment_intent
        
        # Mock quote manufacturer
        mock_quote.manufacturer = mock_manufacturer
        
        result = await stripe_service.create_payment_intent(
            db=db_session,
            order=mock_order,
            quote=mock_quote,
            client=mock_user,
            customer_country="US"
        )
        
        assert result['payment_intent_id'] == "pi_test123"
        assert result['client_secret'] == "pi_test123_secret"
        assert result['region'] == 'us'
        assert 'transaction_id' in result
        
        # Verify Stripe was called with correct parameters
        mock_stripe_create.assert_called_once()
        call_args = mock_stripe_create.call_args[1]
        assert call_args['amount'] == 100000  # $1000 in cents
        assert call_args['currency'] == 'usd'
        assert call_args['capture_method'] == 'manual'
    
    @patch('stripe.PaymentIntent.retrieve')
    async def test_confirm_payment_success(
        self, mock_stripe_retrieve, stripe_service, db_session
    ):
        """Test successful payment confirmation"""
        
        # Create test transaction
        transaction = Transaction(
            client_id=1,
            manufacturer_id=1,
            transaction_type=TransactionType.ORDER_PAYMENT,
            status=TransactionStatus.PENDING,
            region=PaymentRegion.US,
            original_currency="USD",
            platform_currency="USD",
            original_amount=Decimal('100.00'),
            gross_amount=Decimal('100.00'),
            net_amount=Decimal('85.00'),
            platform_commission_amount=Decimal('15.00'),
            manufacturer_payout_amount=Decimal('85.00'),
            stripe_payment_intent_id="pi_test123"
        )
        db_session.add(transaction)
        db_session.commit()
        
        # Mock Stripe response
        mock_payment_intent = Mock()
        mock_payment_intent.status = 'succeeded'
        mock_payment_intent.charges = Mock()
        mock_payment_intent.charges.data = []
        mock_stripe_retrieve.return_value = mock_payment_intent
        
        result = await stripe_service.confirm_payment(db_session, "pi_test123")
        
        assert result is not None
        assert result.status == TransactionStatus.SUCCEEDED
        assert result.authorized_at is not None
    
    @patch('stripe.PaymentIntent.capture')
    async def test_capture_payment_success(
        self, mock_stripe_capture, stripe_service, db_session
    ):
        """Test successful payment capture"""
        
        # Create test transaction
        transaction = Transaction(
            client_id=1,
            manufacturer_id=1,
            transaction_type=TransactionType.ORDER_PAYMENT,
            status=TransactionStatus.REQUIRES_CAPTURE,
            region=PaymentRegion.US,
            original_currency="USD",
            platform_currency="USD",
            original_amount=Decimal('100.00'),
            gross_amount=Decimal('100.00'),
            net_amount=Decimal('85.00'),
            platform_commission_amount=Decimal('15.00'),
            manufacturer_payout_amount=Decimal('85.00'),
            escrow_amount=Decimal('100.00'),
            stripe_payment_intent_id="pi_test123"
        )
        db_session.add(transaction)
        db_session.commit()
        
        # Mock Stripe response
        mock_payment_intent = Mock()
        mock_payment_intent.status = 'succeeded'
        mock_stripe_capture.return_value = mock_payment_intent
        
        success = await stripe_service.capture_payment(db_session, transaction)
        
        assert success is True
        assert transaction.status == TransactionStatus.CAPTURED
        assert transaction.captured_at is not None
        assert transaction.escrow_released_amount == Decimal('100.00')


class TestSubscriptionService:
    """Test subscription management functionality"""
    
    @pytest.fixture
    def subscription_service(self):
        return SubscriptionService()
    
    def test_get_subscription_plans(self, subscription_service):
        """Test subscription plans configuration"""
        plans = subscription_service.get_subscription_plans()
        
        assert 'starter' in plans
        assert 'professional' in plans
        assert 'enterprise' in plans
        
        starter = plans['starter']
        assert starter['price_monthly'] == Decimal('99.00')
        assert starter['limits']['monthly_quotes'] == 50
        assert starter['limits']['commission_rate'] == 2.0
    
    @patch('stripe.Customer.create')
    async def test_create_stripe_customer(
        self, mock_stripe_create, subscription_service, db_session
    ):
        """Test Stripe customer creation"""
        
        # Mock user
        user = Mock(spec=User)
        user.id = 1
        user.email = "test@example.com"
        user.full_name = "Test User"
        user.stripe_customer_id = None
        
        # Mock Stripe response
        mock_customer = Mock()
        mock_customer.id = "cus_test123"
        mock_stripe_create.return_value = mock_customer
        
        customer_id = await subscription_service.create_stripe_customer(
            db_session, user, PaymentRegion.US
        )
        
        assert customer_id == "cus_test123"
        assert user.stripe_customer_id == "cus_test123"
    
    @patch('stripe.Price.list')
    @patch('stripe.Price.create')
    async def test_get_or_create_stripe_price(
        self, mock_price_create, mock_price_list, subscription_service
    ):
        """Test Stripe price creation"""
        
        # Mock empty price list (no existing price)
        mock_price_list.return_value = Mock(data=[])
        
        # Mock price creation
        mock_price = Mock()
        mock_price.id = "price_test123"
        mock_price_create.return_value = mock_price
        
        price_id = await subscription_service._get_or_create_stripe_price(
            "starter", Decimal('99.00'), "month", PaymentRegion.US
        )
        
        assert price_id == "price_test123"
        mock_price_create.assert_called_once()


class TestInvoiceService:
    """Test invoice management functionality"""
    
    @pytest.fixture
    def invoice_service(self):
        return InvoiceService()
    
    def test_generate_invoice_number(self, invoice_service):
        """Test invoice number generation"""
        invoice_number = invoice_service.generate_invoice_number()
        
        assert invoice_number.startswith("INV-")
        assert len(invoice_number) > 10
    
    def test_calculate_due_date_net30(self, invoice_service):
        """Test due date calculation for NET_30"""
        due_date = invoice_service._calculate_due_date("NET_30")
        expected = datetime.utcnow() + timedelta(days=30)
        
        # Allow for small time differences in test execution
        assert abs((due_date - expected).total_seconds()) < 60
    
    def test_calculate_due_date_due_on_receipt(self, invoice_service):
        """Test due date calculation for DUE_ON_RECEIPT"""
        due_date = invoice_service._calculate_due_date("DUE_ON_RECEIPT")
        expected = datetime.utcnow() + timedelta(days=1)
        
        assert abs((due_date - expected).total_seconds()) < 60
    
    async def test_create_invoice(self, invoice_service, db_session):
        """Test invoice creation"""
        
        # Mock objects
        order = Mock(spec=Order)
        order.id = 1
        order.total_amount = Decimal('1000.00')
        order.currency = "USD"
        
        client = Mock(spec=User)
        client.id = 1
        client.country = "US"
        client.stripe_customer_id = None
        
        manufacturer = Mock()
        manufacturer.id = 1
        
        invoice = await invoice_service.create_invoice(
            db=db_session,
            order=order,
            client=client,
            manufacturer=manufacturer,
            payment_terms="NET_30",
            region=PaymentRegion.US
        )
        
        assert invoice is not None
        assert invoice.subtotal == Decimal('1000.00')
        assert invoice.payment_terms == "NET_30"
        assert invoice.status == "DRAFT"
        assert invoice.invoice_number.startswith("INV-")


class TestWebhookHandling:
    """Test webhook event processing"""
    
    @pytest.fixture
    def stripe_service(self):
        return MultiRegionStripeService()
    
    async def test_handle_payment_intent_succeeded(self, stripe_service, db_session):
        """Test payment_intent.succeeded webhook handling"""
        
        # Create test transaction
        transaction = Transaction(
            client_id=1,
            manufacturer_id=1,
            transaction_type=TransactionType.ORDER_PAYMENT,
            status=TransactionStatus.PROCESSING,
            region=PaymentRegion.US,
            original_currency="USD",
            platform_currency="USD",
            original_amount=Decimal('100.00'),
            gross_amount=Decimal('100.00'),
            net_amount=Decimal('85.00'),
            platform_commission_amount=Decimal('15.00'),
            manufacturer_payout_amount=Decimal('85.00'),
            stripe_payment_intent_id="pi_test123"
        )
        db_session.add(transaction)
        db_session.commit()
        
        # Mock webhook event data
        event_data = {
            'object': {
                'id': 'pi_test123',
                'status': 'succeeded'
            }
        }
        
        success = await stripe_service._handle_payment_intent_webhook(
            db_session, 'payment_intent.succeeded', event_data
        )
        
        assert success is True
        assert transaction.status == TransactionStatus.SUCCEEDED
        assert transaction.authorized_at is not None
    
    async def test_handle_payment_intent_failed(self, stripe_service, db_session):
        """Test payment_intent.payment_failed webhook handling"""
        
        # Create test transaction
        transaction = Transaction(
            client_id=1,
            manufacturer_id=1,
            transaction_type=TransactionType.ORDER_PAYMENT,
            status=TransactionStatus.PROCESSING,
            region=PaymentRegion.US,
            original_currency="USD",
            platform_currency="USD",
            original_amount=Decimal('100.00'),
            gross_amount=Decimal('100.00'),
            net_amount=Decimal('85.00'),
            platform_commission_amount=Decimal('15.00'),
            manufacturer_payout_amount=Decimal('85.00'),
            stripe_payment_intent_id="pi_test123"
        )
        db_session.add(transaction)
        db_session.commit()
        
        # Mock webhook event data
        event_data = {
            'object': {
                'id': 'pi_test123',
                'status': 'failed',
                'last_payment_error': {
                    'message': 'Payment failed',
                    'code': 'card_declined'
                }
            }
        }
        
        success = await stripe_service._handle_payment_intent_webhook(
            db_session, 'payment_intent.payment_failed', event_data
        )
        
        assert success is True
        assert transaction.status == TransactionStatus.FAILED
        assert transaction.failed_at is not None
        assert transaction.failure_reason == 'Payment failed'
        assert transaction.failure_code == 'card_declined'


class TestPaymentAnalytics:
    """Test payment analytics and reporting"""
    
    def test_transaction_metrics(self, db_session):
        """Test transaction metrics calculation"""
        
        # Create test transactions
        transactions = [
            Transaction(
                client_id=1,
                manufacturer_id=1,
                transaction_type=TransactionType.ORDER_PAYMENT,
                status=TransactionStatus.SUCCEEDED,
                region=PaymentRegion.US,
                original_currency="USD",
                platform_currency="USD",
                original_amount=Decimal('100.00'),
                gross_amount=Decimal('100.00'),
                net_amount=Decimal('85.00'),
                platform_commission_amount=Decimal('15.00'),
                manufacturer_payout_amount=Decimal('85.00')
            ),
            Transaction(
                client_id=1,
                manufacturer_id=1,
                transaction_type=TransactionType.ORDER_PAYMENT,
                status=TransactionStatus.FAILED,
                region=PaymentRegion.EU,
                original_currency="EUR",
                platform_currency="USD",
                original_amount=Decimal('50.00'),
                gross_amount=Decimal('55.00'),  # After conversion
                net_amount=Decimal('45.00'),
                platform_commission_amount=Decimal('10.00'),
                manufacturer_payout_amount=Decimal('45.00')
            )
        ]
        
        for transaction in transactions:
            db_session.add(transaction)
        db_session.commit()
        
        # Query transactions
        all_transactions = db_session.query(Transaction).all()
        
        # Calculate metrics
        total_volume = sum(float(t.gross_amount) for t in all_transactions)
        successful_count = len([t for t in all_transactions if t.status == TransactionStatus.SUCCEEDED])
        success_rate = (successful_count / len(all_transactions)) * 100
        
        assert total_volume == 155.0  # 100 + 55
        assert successful_count == 1
        assert success_rate == 50.0


# Integration Tests
class TestPaymentIntegration:
    """Integration tests for complete payment flows"""
    
    @pytest.mark.integration
    async def test_complete_payment_flow(self, db_session):
        """Test complete payment flow from intent to capture"""
        
        stripe_service = MultiRegionStripeService()
        
        # Mock external dependencies
        with patch('stripe.PaymentIntent.create') as mock_create, \
             patch('stripe.PaymentIntent.retrieve') as mock_retrieve, \
             patch('stripe.PaymentIntent.capture') as mock_capture:
            
            # Setup mocks
            mock_create.return_value = Mock(
                id="pi_test123", 
                client_secret="pi_test123_secret"
            )
            mock_retrieve.return_value = Mock(
                status='succeeded',
                charges=Mock(data=[])
            )
            mock_capture.return_value = Mock(status='succeeded')
            
            # Mock objects
            user = Mock(spec=User)
            user.id = 1
            user.email = "test@example.com"
            user.country = "US"
            
            manufacturer = Mock()
            manufacturer.id = 1
            
            order = Mock(spec=Order)
            order.id = 1
            order.title = "Test Order"
            order.total_amount = Decimal('1000.00')
            order.currency = "USD"
            order.client_id = 1
            
            quote = Mock(spec=Quote)
            quote.id = 1
            quote.price_total = Decimal('1000.00')
            quote.currency = "USD"
            quote.manufacturer = manufacturer
            
            # 1. Create payment intent
            result = await stripe_service.create_payment_intent(
                db=db_session,
                order=order,
                quote=quote,
                client=user,
                customer_country="US"
            )
            
            assert 'payment_intent_id' in result
            payment_intent_id = result['payment_intent_id']
            
            # 2. Confirm payment
            transaction = await stripe_service.confirm_payment(
                db_session, payment_intent_id
            )
            
            assert transaction.status == TransactionStatus.SUCCEEDED
            
            # 3. Capture payment (escrow release)
            transaction.status = TransactionStatus.REQUIRES_CAPTURE
            db_session.commit()
            
            success = await stripe_service.capture_payment(
                db_session, transaction
            )
            
            assert success is True
            assert transaction.status == TransactionStatus.CAPTURED 
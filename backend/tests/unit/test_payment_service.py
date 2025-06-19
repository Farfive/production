"""
Unit tests for Payment Service
"""
import pytest
from unittest.mock import Mock, patch, AsyncMock
from decimal import Decimal
import stripe
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.services.payment import PaymentService
from app.models.payment import Payment
from app.models.order import Order
from app.models.quote import Quote
from tests.factories import PaymentFactory, OrderFactory, QuoteFactory, UserFactory


class TestPaymentService:
    """Test cases for PaymentService"""

    @pytest.fixture
    def mock_db_session(self):
        """Mock database session"""
        return Mock(spec=Session)

    @pytest.fixture
    def payment_service(self, mock_db_session):
        """Create PaymentService instance with mocked database"""
        return PaymentService(db=mock_db_session)

    @pytest.fixture
    def sample_payment(self):
        """Create a sample payment"""
        return PaymentFactory.build()

    @pytest.fixture
    def sample_order(self):
        """Create a sample order"""
        return OrderFactory.build()

    @pytest.fixture
    def sample_quote(self):
        """Create a sample quote"""
        return QuoteFactory.build()

    @pytest.mark.unit
    @pytest.mark.payment
    @pytest.mark.asyncio
    async def test_create_payment_intent_success(self, payment_service, mock_stripe):
        """Test successful payment intent creation"""
        # Arrange
        amount = Decimal('1000.00')
        currency = 'USD'
        customer_id = 'cus_test123'
        metadata = {'order_id': '123'}

        mock_stripe['payment_intent_create'].return_value = Mock(
            id='pi_test123',
            client_secret='pi_test123_secret_test',
            amount=100000,  # Stripe uses cents
            currency='usd',
            status='requires_payment_method'
        )

        # Act
        result = await payment_service.create_payment_intent(
            amount=amount,
            currency=currency,
            customer_id=customer_id,
            metadata=metadata
        )

        # Assert
        assert result['id'] == 'pi_test123'
        assert result['client_secret'] == 'pi_test123_secret_test'
        assert result['amount'] == 100000
        mock_stripe['payment_intent_create'].assert_called_once()

    @pytest.mark.unit
    @pytest.mark.payment
    @pytest.mark.asyncio
    async def test_create_payment_intent_stripe_error(self, payment_service, mock_stripe):
        """Test payment intent creation with Stripe error"""
        # Arrange
        amount = Decimal('1000.00')
        currency = 'USD'
        
        mock_stripe['payment_intent_create'].side_effect = stripe.error.CardError(
            message="Your card was declined.",
            param="card",
            code="card_declined"
        )

        # Act & Assert
        with pytest.raises(stripe.error.CardError):
            await payment_service.create_payment_intent(amount=amount, currency=currency)

    @pytest.mark.unit
    @pytest.mark.payment
    @pytest.mark.asyncio
    async def test_confirm_payment_intent_success(self, payment_service, mock_stripe):
        """Test successful payment intent confirmation"""
        # Arrange
        payment_intent_id = 'pi_test123'
        payment_method_id = 'pm_test123'

        mock_stripe['payment_intent_confirm'].return_value = Mock(
            id='pi_test123',
            status='succeeded',
            charges=Mock(data=[Mock(id='ch_test123')])
        )

        # Act
        result = await payment_service.confirm_payment_intent(
            payment_intent_id=payment_intent_id,
            payment_method_id=payment_method_id
        )

        # Assert
        assert result['id'] == 'pi_test123'
        assert result['status'] == 'succeeded'
        mock_stripe['payment_intent_confirm'].assert_called_once()

    @pytest.mark.unit
    @pytest.mark.payment
    @pytest.mark.asyncio
    async def test_create_customer_success(self, payment_service, mock_stripe):
        """Test successful Stripe customer creation"""
        # Arrange
        user_data = {
            'email': 'test@example.com',
            'name': 'John Doe',
            'phone': '+1234567890'
        }

        mock_stripe['customer_create'].return_value = Mock(
            id='cus_test123',
            email='test@example.com',
            name='John Doe'
        )

        # Act
        result = await payment_service.create_customer(user_data)

        # Assert
        assert result['id'] == 'cus_test123'
        assert result['email'] == 'test@example.com'
        mock_stripe['customer_create'].assert_called_once()

    @pytest.mark.unit
    @pytest.mark.payment
    @pytest.mark.asyncio
    async def test_process_payment_success(self, payment_service, mock_db_session, mock_stripe, sample_order, sample_quote):
        """Test successful payment processing"""
        # Arrange
        payment_data = {
            'order_id': sample_order.id,
            'quote_id': sample_quote.id,
            'amount': Decimal('1000.00'),
            'currency': 'USD',
            'payment_method_id': 'pm_test123'
        }

        mock_db_session.query.return_value.filter.return_value.first.side_effect = [sample_order, sample_quote]
        mock_db_session.add = Mock()
        mock_db_session.commit = Mock()
        mock_db_session.refresh = Mock()

        mock_stripe['payment_intent_create'].return_value = Mock(
            id='pi_test123',
            client_secret='pi_test123_secret_test'
        )
        mock_stripe['payment_intent_confirm'].return_value = Mock(
            id='pi_test123',
            status='succeeded'
        )

        # Act
        result = await payment_service.process_payment(payment_data)

        # Assert
        assert result is not None
        assert result.status == 'succeeded'
        mock_db_session.add.assert_called_once()
        mock_db_session.commit.assert_called_once()

    @pytest.mark.unit
    @pytest.mark.payment
    @pytest.mark.asyncio
    async def test_process_payment_order_not_found(self, payment_service, mock_db_session):
        """Test payment processing when order is not found"""
        # Arrange
        payment_data = {
            'order_id': 999,
            'quote_id': 1,
            'amount': Decimal('1000.00'),
            'currency': 'USD'
        }

        mock_db_session.query.return_value.filter.return_value.first.return_value = None

        # Act & Assert
        with pytest.raises(ValueError, match="Order not found"):
            await payment_service.process_payment(payment_data)

    @pytest.mark.unit
    @pytest.mark.payment
    @pytest.mark.asyncio
    async def test_get_payment_by_id_success(self, payment_service, mock_db_session, sample_payment):
        """Test successful payment retrieval by ID"""
        # Arrange
        payment_id = 1
        mock_db_session.query.return_value.filter.return_value.first.return_value = sample_payment

        # Act
        result = await payment_service.get_payment_by_id(payment_id)

        # Assert
        assert result == sample_payment
        mock_db_session.query.assert_called_once_with(Payment)

    @pytest.mark.unit
    @pytest.mark.payment
    @pytest.mark.asyncio
    async def test_get_payment_by_stripe_id_success(self, payment_service, mock_db_session, sample_payment):
        """Test successful payment retrieval by Stripe ID"""
        # Arrange
        stripe_id = 'pi_test123'
        mock_db_session.query.return_value.filter.return_value.first.return_value = sample_payment

        # Act
        result = await payment_service.get_payment_by_stripe_id(stripe_id)

        # Assert
        assert result == sample_payment

    @pytest.mark.unit
    @pytest.mark.payment
    @pytest.mark.asyncio
    async def test_update_payment_status_success(self, payment_service, mock_db_session, sample_payment):
        """Test successful payment status update"""
        # Arrange
        payment_id = 1
        new_status = 'succeeded'
        mock_db_session.query.return_value.filter.return_value.first.return_value = sample_payment
        mock_db_session.commit = Mock()

        # Act
        result = await payment_service.update_payment_status(payment_id, new_status)

        # Assert
        assert result.status == new_status
        mock_db_session.commit.assert_called_once()

    @pytest.mark.unit
    @pytest.mark.payment
    @pytest.mark.asyncio
    async def test_refund_payment_success(self, payment_service, mock_stripe):
        """Test successful payment refund"""
        # Arrange
        payment_intent_id = 'pi_test123'
        amount = Decimal('500.00')

        with patch('stripe.Refund.create') as mock_refund_create:
            mock_refund_create.return_value = Mock(
                id='re_test123',
                amount=50000,  # Stripe uses cents
                status='succeeded'
            )

            # Act
            result = await payment_service.refund_payment(payment_intent_id, amount)

            # Assert
            assert result['id'] == 're_test123'
            assert result['amount'] == 50000
            mock_refund_create.assert_called_once()

    @pytest.mark.unit
    @pytest.mark.payment
    @pytest.mark.asyncio
    async def test_calculate_platform_fee(self, payment_service):
        """Test platform fee calculation"""
        # Arrange
        amount = Decimal('1000.00')
        fee_percentage = Decimal('0.05')  # 5%

        # Act
        result = payment_service.calculate_platform_fee(amount, fee_percentage)

        # Assert
        assert result == Decimal('50.00')

    @pytest.mark.unit
    @pytest.mark.payment
    @pytest.mark.asyncio
    async def test_get_payment_history_success(self, payment_service, mock_db_session):
        """Test getting payment history for a user"""
        # Arrange
        user_id = 1
        payments = [PaymentFactory.build() for _ in range(5)]
        mock_db_session.query.return_value.join.return_value.filter.return_value.order_by.return_value.all.return_value = payments

        # Act
        result = await payment_service.get_payment_history(user_id)

        # Assert
        assert len(result) == 5
        assert result == payments

    @pytest.mark.unit
    @pytest.mark.payment
    @pytest.mark.asyncio
    async def test_process_webhook_payment_succeeded(self, payment_service, mock_db_session, sample_payment):
        """Test processing Stripe webhook for successful payment"""
        # Arrange
        webhook_data = {
            'type': 'payment_intent.succeeded',
            'data': {
                'object': {
                    'id': 'pi_test123',
                    'status': 'succeeded',
                    'amount': 100000,
                    'currency': 'usd'
                }
            }
        }

        mock_db_session.query.return_value.filter.return_value.first.return_value = sample_payment
        mock_db_session.commit = Mock()

        # Act
        result = await payment_service.process_webhook(webhook_data)

        # Assert
        assert result is True
        assert sample_payment.status == 'succeeded'
        mock_db_session.commit.assert_called_once()

    @pytest.mark.unit
    @pytest.mark.payment
    @pytest.mark.asyncio
    async def test_process_webhook_payment_failed(self, payment_service, mock_db_session, sample_payment):
        """Test processing Stripe webhook for failed payment"""
        # Arrange
        webhook_data = {
            'type': 'payment_intent.payment_failed',
            'data': {
                'object': {
                    'id': 'pi_test123',
                    'status': 'failed',
                    'last_payment_error': {
                        'code': 'card_declined',
                        'message': 'Your card was declined.'
                    }
                }
            }
        }

        mock_db_session.query.return_value.filter.return_value.first.return_value = sample_payment
        mock_db_session.commit = Mock()

        # Act
        result = await payment_service.process_webhook(webhook_data)

        # Assert
        assert result is True
        assert sample_payment.status == 'failed'

    @pytest.mark.unit
    @pytest.mark.payment
    @pytest.mark.asyncio
    async def test_validate_payment_amount(self, payment_service):
        """Test payment amount validation"""
        # Test valid amounts
        assert payment_service.validate_payment_amount(Decimal('10.00')) is True
        assert payment_service.validate_payment_amount(Decimal('1000.50')) is True
        
        # Test invalid amounts
        assert payment_service.validate_payment_amount(Decimal('0.00')) is False
        assert payment_service.validate_payment_amount(Decimal('-10.00')) is False
        assert payment_service.validate_payment_amount(Decimal('0.001')) is False  # Too many decimal places

    @pytest.mark.unit
    @pytest.mark.payment
    @pytest.mark.asyncio
    async def test_get_payment_statistics(self, payment_service, mock_db_session):
        """Test getting payment statistics"""
        # Arrange
        mock_db_session.query.return_value.count.return_value = 100
        mock_db_session.query.return_value.filter.return_value.count.side_effect = [80, 15, 5]  # succeeded, pending, failed
        
        with patch('sqlalchemy.func.sum') as mock_sum:
            mock_sum.return_value = 50000

            # Act
            result = await payment_service.get_payment_statistics()

            # Assert
            assert result['total_payments'] == 100
            assert result['successful_payments'] == 80
            assert result['pending_payments'] == 15
            assert result['failed_payments'] == 5

    @pytest.mark.unit
    @pytest.mark.payment
    @pytest.mark.parametrize("currency,expected_multiplier", [
        ("USD", 100),
        ("EUR", 100),
        ("GBP", 100),
        ("JPY", 1)
    ])
    async def test_convert_to_stripe_amount(self, payment_service, currency, expected_multiplier):
        """Test converting amount to Stripe format for different currencies"""
        # Arrange
        amount = Decimal('10.50')

        # Act
        result = payment_service.convert_to_stripe_amount(amount, currency)

        # Assert
        expected = int(amount * expected_multiplier)
        assert result == expected

    @pytest.mark.unit
    @pytest.mark.payment
    @pytest.mark.asyncio
    async def test_handle_payment_dispute(self, payment_service, mock_db_session, sample_payment):
        """Test handling payment disputes"""
        # Arrange
        dispute_data = {
            'payment_intent_id': 'pi_test123',
            'dispute_id': 'dp_test123',
            'reason': 'fraudulent',
            'amount': 100000
        }

        mock_db_session.query.return_value.filter.return_value.first.return_value = sample_payment
        mock_db_session.commit = Mock()

        # Act
        result = await payment_service.handle_payment_dispute(dispute_data)

        # Assert
        assert result is True
        assert sample_payment.status == 'disputed'

    @pytest.mark.unit
    @pytest.mark.payment
    @pytest.mark.asyncio
    async def test_retry_failed_payment(self, payment_service, mock_db_session, mock_stripe, sample_payment):
        """Test retrying a failed payment"""
        # Arrange
        payment_id = 1
        new_payment_method_id = 'pm_new123'
        
        sample_payment.status = 'failed'
        mock_db_session.query.return_value.filter.return_value.first.return_value = sample_payment
        mock_db_session.commit = Mock()

        mock_stripe['payment_intent_confirm'].return_value = Mock(
            id='pi_test123',
            status='succeeded'
        )

        # Act
        result = await payment_service.retry_failed_payment(payment_id, new_payment_method_id)

        # Assert
        assert result.status == 'succeeded'
        mock_stripe['payment_intent_confirm'].assert_called_once()

    @pytest.mark.unit
    @pytest.mark.payment
    @pytest.mark.slow
    @pytest.mark.asyncio
    async def test_bulk_payment_processing(self, payment_service, mock_db_session, mock_stripe):
        """Test processing multiple payments in bulk"""
        # Arrange
        payment_requests = [
            {
                'order_id': i,
                'amount': Decimal('100.00'),
                'currency': 'USD',
                'payment_method_id': f'pm_test{i}'
            }
            for i in range(10)
        ]

        mock_db_session.query.return_value.filter.return_value.first.return_value = OrderFactory.build()
        mock_db_session.add = Mock()
        mock_db_session.commit = Mock()

        mock_stripe['payment_intent_create'].return_value = Mock(id='pi_test123')
        mock_stripe['payment_intent_confirm'].return_value = Mock(id='pi_test123', status='succeeded')

        # Act
        results = await payment_service.bulk_process_payments(payment_requests)

        # Assert
        assert len(results) == 10
        assert all(result.status == 'succeeded' for result in results)

    @pytest.mark.unit
    @pytest.mark.payment
    @pytest.mark.asyncio
    async def test_payment_security_validation(self, payment_service):
        """Test payment security validations"""
        # Test valid payment data
        valid_data = {
            'amount': Decimal('100.00'),
            'currency': 'USD',
            'payment_method_id': 'pm_valid123'
        }
        assert payment_service.validate_payment_security(valid_data) is True

        # Test invalid payment data
        invalid_data = {
            'amount': Decimal('0.00'),
            'currency': 'INVALID',
            'payment_method_id': ''
        }
        assert payment_service.validate_payment_security(invalid_data) is False 
import stripe
import hmac
import hashlib
import json
from typing import Dict, Any, Optional, List, Tuple
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from loguru import logger
import uuid
import requests
from enum import Enum

# forex-python 1.8+ removed CurrencyConverter; provide fallback shim
try:
    from forex_python.converter import CurrencyRates, CurrencyConverter
except ImportError:  # pragma: no cover – fallback for newer forex-python
    from forex_python.converter import CurrencyRates  # type: ignore

    class CurrencyConverter:  # type: ignore
        """Minimal replacement for deprecated CurrencyConverter class."""

        def __init__(self):
            self._cr = CurrencyRates()

        def convert(self, from_currency: str, to_currency: str, amount: float) -> float:  # noqa: D401,E501
            rate = self._cr.get_rate(from_currency, to_currency)
            return rate * amount

from app.core.config import settings
from app.models.payment import (
    Transaction, TransactionStatus, TransactionType, PaymentMethod, PaymentRegion,
    StripeConnectAccount, ConnectAccountType, Subscription, SubscriptionStatus,
    WebhookEvent
)
from app.models.order import Order, OrderStatus
from app.models.quote import Quote
from app.models.user import User
from app.models.invoice import Invoice


class StripeRegionConfig:
    """Configuration for different Stripe regions"""
    
    REGIONS = {
        PaymentRegion.US: {
            'api_key': settings.STRIPE_US_SECRET_KEY,
            'publishable_key': settings.STRIPE_US_PUBLISHABLE_KEY,
            'webhook_secret': settings.STRIPE_US_WEBHOOK_SECRET,
            'currencies': ['USD', 'CAD'],
            'payment_methods': [
                PaymentMethod.CARD, PaymentMethod.ACH_DEBIT, 
                PaymentMethod.APPLE_PAY, PaymentMethod.GOOGLE_PAY
            ],
            'tax_rates': {'default': 0.0875}  # Average US sales tax
        },
        PaymentRegion.EU: {
            'api_key': settings.STRIPE_EU_SECRET_KEY,
            'publishable_key': settings.STRIPE_EU_PUBLISHABLE_KEY,
            'webhook_secret': settings.STRIPE_EU_WEBHOOK_SECRET,
            'currencies': ['EUR', 'GBP', 'PLN', 'CHF', 'SEK', 'NOK', 'DKK'],
            'payment_methods': [
                PaymentMethod.CARD, PaymentMethod.SEPA_DEBIT, PaymentMethod.BANCONTACT,
                PaymentMethod.IDEAL, PaymentMethod.SOFORT, PaymentMethod.GIROPAY,
                PaymentMethod.P24, PaymentMethod.EPS
            ],
            'tax_rates': {'default': 0.21}  # Average EU VAT
        },
        PaymentRegion.UK: {
            'api_key': settings.STRIPE_UK_SECRET_KEY,
            'publishable_key': settings.STRIPE_UK_PUBLISHABLE_KEY,
            'webhook_secret': settings.STRIPE_UK_WEBHOOK_SECRET,
            'currencies': ['GBP', 'EUR', 'USD'],
            'payment_methods': [
                PaymentMethod.CARD, PaymentMethod.APPLE_PAY, PaymentMethod.GOOGLE_PAY
            ],
            'tax_rates': {'default': 0.20}  # UK VAT
        }
    }


class PaymentError(Exception):
    """Custom payment processing error"""
    pass


class MultiRegionStripeService:
    """Comprehensive multinational Stripe payment service"""
    
    def __init__(self):
        self.currency_converter = CurrencyConverter()
        self.currency_rates = CurrencyRates()
        
    def get_stripe_config(self, region: PaymentRegion) -> Dict[str, Any]:
        """Get Stripe configuration for specific region"""
        return StripeRegionConfig.REGIONS.get(region, StripeRegionConfig.REGIONS[PaymentRegion.US])
    
    def set_stripe_key(self, region: PaymentRegion):
        """Set Stripe API key for specific region"""
        config = self.get_stripe_config(region)
        stripe.api_key = config['api_key']
    
    def detect_region(self, country_code: str) -> PaymentRegion:
        """Detect payment region based on country code"""
        country_to_region = {
            'US': PaymentRegion.US, 'CA': PaymentRegion.US,
            'GB': PaymentRegion.UK,
            'DE': PaymentRegion.EU, 'FR': PaymentRegion.EU, 'IT': PaymentRegion.EU,
            'ES': PaymentRegion.EU, 'NL': PaymentRegion.EU, 'BE': PaymentRegion.EU,
            'PL': PaymentRegion.EU, 'AT': PaymentRegion.EU, 'CH': PaymentRegion.EU,
            'SE': PaymentRegion.EU, 'NO': PaymentRegion.EU, 'DK': PaymentRegion.EU,
            'AU': PaymentRegion.AU, 'SG': PaymentRegion.SG, 'JP': PaymentRegion.JP
        }
        return country_to_region.get(country_code.upper(), PaymentRegion.OTHER)
    
    def get_exchange_rate(self, from_currency: str, to_currency: str) -> Decimal:
        """Get current exchange rate with fallback"""
        if from_currency == to_currency:
            return Decimal('1.0')
        
        try:
            rate = self.currency_rates.get_rate(from_currency, to_currency)
            return Decimal(str(rate)).quantize(Decimal('0.000001'), rounding=ROUND_HALF_UP)
        except Exception as e:
            logger.warning(f"Failed to get exchange rate {from_currency}->{to_currency}: {e}")
            # Fallback to approximate rates or API
            return Decimal('1.0')
    
    def convert_currency(self, amount: Decimal, from_currency: str, to_currency: str) -> Decimal:
        """Convert currency amount"""
        if from_currency == to_currency:
            return amount
        
        rate = self.get_exchange_rate(from_currency, to_currency)
        converted = amount * rate
        return converted.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    def calculate_fees(
        self, 
        amount: Decimal, 
        region: PaymentRegion, 
        payment_method: PaymentMethod,
        is_cross_border: bool = False
    ) -> Dict[str, Decimal]:
        """Calculate all payment processing fees"""
        
        # Base Stripe fees by region and payment method
        fee_structure = {
            PaymentRegion.US: {
                PaymentMethod.CARD: {'rate': Decimal('0.029'), 'fixed': Decimal('0.30')},
                PaymentMethod.ACH_DEBIT: {'rate': Decimal('0.008'), 'fixed': Decimal('0.00')},
            },
            PaymentRegion.EU: {
                PaymentMethod.CARD: {'rate': Decimal('0.014'), 'fixed': Decimal('0.25')},
                PaymentMethod.SEPA_DEBIT: {'rate': Decimal('0.008'), 'fixed': Decimal('0.00')},
                PaymentMethod.BANCONTACT: {'rate': Decimal('0.014'), 'fixed': Decimal('0.25')},
                PaymentMethod.IDEAL: {'rate': Decimal('0.008'), 'fixed': Decimal('0.00')},
            },
            PaymentRegion.UK: {
                PaymentMethod.CARD: {'rate': Decimal('0.014'), 'fixed': Decimal('0.20')},
            }
        }
        
        # Get fee structure for region and payment method
        fees = fee_structure.get(region, {}).get(payment_method, {'rate': Decimal('0.029'), 'fixed': Decimal('0.30')})
        
        # Calculate base processing fee
        processing_fee = (amount * fees['rate']) + fees['fixed']
        
        # Cross-border fee (1.5% for international cards)
        cross_border_fee = Decimal('0.0') if not is_cross_border else amount * Decimal('0.015')
        
        # Currency conversion fee (1% if currencies differ)
        conversion_fee = Decimal('0.0')  # Calculated separately when needed
        
        return {
            'stripe_fee': processing_fee,
            'cross_border_fee': cross_border_fee,
            'currency_conversion_fee': conversion_fee,
            'total_fees': processing_fee + cross_border_fee + conversion_fee
        }
    
    def calculate_tax(
        self, 
        amount: Decimal, 
        region: PaymentRegion, 
        country_code: str,
        tax_included: bool = True
    ) -> Dict[str, Decimal]:
        """Calculate tax based on region and country"""
        
        # Get tax rate for region/country
        config = self.get_stripe_config(region)
        tax_rate = Decimal(str(config['tax_rates']['default']))
        
        # Country-specific overrides
        country_tax_rates = {
            'US-CA': Decimal('0.0725'),  # California
            'US-NY': Decimal('0.08'),    # New York
            'DE': Decimal('0.19'),       # Germany VAT
            'FR': Decimal('0.20'),       # France VAT
            'UK': Decimal('0.20'),       # UK VAT
        }
        
        tax_rate = country_tax_rates.get(country_code, tax_rate)
        
        if tax_included:
            # Extract tax from total amount
            tax_amount = amount - (amount / (Decimal('1.0') + tax_rate))
            net_amount = amount - tax_amount
        else:
            # Add tax to net amount
            net_amount = amount
            tax_amount = amount * tax_rate
            
        return {
            'tax_rate': tax_rate,
            'tax_amount': tax_amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
            'net_amount': net_amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        }
    
    async def create_payment_intent(
        self,
        db: Session,
        order: Order,
        quote: Quote,
        client: User,
        payment_method_types: List[str] = None,
        customer_country: str = 'US'
    ) -> Dict[str, Any]:
        """Create comprehensive payment intent with regional support"""
        
        try:
            # Detect region and set appropriate Stripe key
            region = self.detect_region(customer_country)
            self.set_stripe_key(region)
            
            manufacturer = quote.manufacturer
            total_amount = Decimal(str(quote.price_total))
            original_currency = quote.currency or 'USD'
            platform_currency = settings.PLATFORM_BASE_CURRENCY or 'USD'
            
            # Convert to platform currency if needed
            if original_currency != platform_currency:
                platform_amount = self.convert_currency(total_amount, original_currency, platform_currency)
                exchange_rate = self.get_exchange_rate(original_currency, platform_currency)
            else:
                platform_amount = total_amount
                exchange_rate = Decimal('1.0')
            
            # Calculate fees
            fees = self.calculate_fees(
                platform_amount, 
                region, 
                PaymentMethod.CARD,  # Default to card
                is_cross_border=(customer_country not in ['US', 'CA'] and region == PaymentRegion.US)
            )
            
            # Calculate tax
            tax_info = self.calculate_tax(platform_amount, region, customer_country)
            
            # Calculate commission
            commission_rate = Decimal(str(settings.PLATFORM_COMMISSION_RATE or 10.0)) / 100
            commission_amount = platform_amount * commission_rate
            
            # Calculate manufacturer payout
            manufacturer_payout = platform_amount - commission_amount - fees['total_fees']
            
            # Generate idempotency key
            idempotency_key = str(uuid.uuid4())
            
            # Default payment method types based on region
            if not payment_method_types:
                config = self.get_stripe_config(region)
                payment_method_types = [pm.value for pm in config['payment_methods']]
            
            # Create Payment Intent
            payment_intent_params = {
                'amount': int(platform_amount * 100),  # Convert to cents
                'currency': platform_currency.lower(),
                'payment_method_types': payment_method_types,
                'description': f"Order #{order.id}: {order.title}",
                'metadata': {
                    'order_id': str(order.id),
                    'quote_id': str(quote.id),
                    'client_id': str(client.id),
                    'manufacturer_id': str(manufacturer.id),
                    'region': region.value
                },
                # Manual capture for escrow functionality
                'capture_method': 'manual',
                # Setup for 3D Secure
                'confirmation_method': 'automatic',
                'setup_future_usage': 'off_session' if hasattr(client, 'is_enterprise') and client.is_enterprise else None
            }
            
            # Add Connect transfer if manufacturer has connected account
            if hasattr(manufacturer, 'stripe_connect_account') and manufacturer.stripe_connect_account:
                connect_account = manufacturer.stripe_connect_account
                payment_intent_params['transfer_data'] = {
                    'destination': connect_account.stripe_account_id,
                    'amount': int(manufacturer_payout * 100)
                }
            
            payment_intent = stripe.PaymentIntent.create(
                **payment_intent_params,
                idempotency_key=idempotency_key
            )
            
            # Create transaction record
            transaction = Transaction(
                order_id=order.id,
                quote_id=quote.id,
                client_id=client.id,
                manufacturer_id=manufacturer.id,
                transaction_type=TransactionType.ORDER_PAYMENT,
                status=TransactionStatus.PENDING,
                
                # Regional info
                region=region,
                original_currency=original_currency,
                platform_currency=platform_currency,
                
                # Amounts
                original_amount=total_amount,
                gross_amount=platform_amount,
                net_amount=manufacturer_payout,
                
                # Fees
                platform_commission_rate_pct=commission_rate * 100,
                platform_commission_amount=commission_amount,
                stripe_fee_amount=fees['stripe_fee'],
                cross_border_fee_amount=fees['cross_border_fee'],
                currency_conversion_fee_amount=fees['currency_conversion_fee'],
                
                # Tax
                tax_rate_pct=tax_info['tax_rate'] * 100,
                tax_amount=tax_info['tax_amount'],
                tax_jurisdiction=f"{region.value}-{customer_country}",
                
                # Manufacturer payout
                manufacturer_payout_amount=manufacturer_payout,
                manufacturer_payout_currency=platform_currency,
                
                # Escrow
                escrow_amount=platform_amount,
                
                # Exchange rate
                exchange_rate=exchange_rate,
                exchange_rate_timestamp=datetime.utcnow(),
                
                # Stripe IDs
                stripe_payment_intent_id=payment_intent.id,
                idempotency_key=idempotency_key,
                
                # Metadata
                metadata={
                    'region': region.value,
                    'customer_country': customer_country,
                    'payment_method_types': payment_method_types
                }
            )
            
            db.add(transaction)
            db.commit()
            
            logger.info(f"Payment intent created for order {order.id}: {payment_intent.id}")
            
            return {
                'client_secret': payment_intent.client_secret,
                'payment_intent_id': payment_intent.id,
                'transaction_id': transaction.id,
                'amount': float(platform_amount),
                'original_amount': float(total_amount),
                'currency': platform_currency,
                'original_currency': original_currency,
                'commission': float(commission_amount),
                'fees': {k: float(v) for k, v in fees.items()},
                'tax': {k: float(v) if isinstance(v, Decimal) else v for k, v in tax_info.items()},
                'manufacturer_payout': float(manufacturer_payout),
                'region': region.value,
                'publishable_key': self.get_stripe_config(region)['publishable_key']
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating payment intent: {str(e)}")
            db.rollback()
            raise PaymentError(f"Payment processing error: {str(e)}")
        except Exception as e:
            logger.error(f"Error creating payment intent: {str(e)}")
            db.rollback()
            raise PaymentError(f"Payment creation failed: {str(e)}")
    
    async def confirm_payment(
        self,
        db: Session,
        payment_intent_id: str
    ) -> Optional[Transaction]:
        """Confirm payment and update transaction status"""
        
        try:
            # Find transaction
            transaction = db.query(Transaction).filter(
                Transaction.stripe_payment_intent_id == payment_intent_id
            ).first()
            
            if not transaction:
                logger.error(f"Transaction not found for payment intent {payment_intent_id}")
                return None
            
            # Set correct Stripe key for region
            self.set_stripe_key(transaction.region)
            
            # Retrieve Payment Intent from Stripe
            payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            
            # Update transaction based on Stripe status
            status_mapping = {
                'succeeded': TransactionStatus.SUCCEEDED,
                'requires_payment_method': TransactionStatus.REQUIRES_PAYMENT_METHOD,
                'requires_confirmation': TransactionStatus.REQUIRES_CONFIRMATION,
                'requires_action': TransactionStatus.REQUIRES_ACTION,
                'processing': TransactionStatus.PROCESSING,
                'requires_capture': TransactionStatus.REQUIRES_CAPTURE,
                'canceled': TransactionStatus.CANCELLED
            }
            
            transaction.status = status_mapping.get(payment_intent.status, TransactionStatus.PENDING)
            
            # Update payment method details
            if payment_intent.charges and payment_intent.charges.data:
                charge = payment_intent.charges.data[0]
                payment_method = charge.payment_method_details
                
                transaction.payment_method_type = PaymentMethod.CARD  # Default
                transaction.payment_method_details = {
                    'type': payment_method.type if payment_method else 'card',
                    'card': payment_method.card._asdict() if payment_method and hasattr(payment_method, 'card') else {}
                }
                
                # Update fraud information
                if hasattr(charge.outcome, 'risk_level'):
                    transaction.fraud_outcome = charge.outcome.risk_level
                    transaction.fraud_score = getattr(charge.outcome, 'risk_score', None)
            
            # Update timestamps
            if transaction.status == TransactionStatus.SUCCEEDED:
                transaction.authorized_at = datetime.utcnow()
                
                # Update order status
                if transaction.order:
                    transaction.order.status = OrderStatus.PAYMENT_COMPLETED
                    
            elif transaction.status in [TransactionStatus.REQUIRES_PAYMENT_METHOD, TransactionStatus.CANCELLED]:
                transaction.failed_at = datetime.utcnow()
                transaction.failure_reason = payment_intent.last_payment_error.message if payment_intent.last_payment_error else "Payment failed"
                transaction.failure_code = payment_intent.last_payment_error.code if payment_intent.last_payment_error else None
            
            db.commit()
            
            logger.info(f"Payment confirmed for transaction {transaction.id}: {transaction.status}")
            return transaction
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error confirming payment: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Error confirming payment: {str(e)}")
            return None
    
    async def capture_payment(
        self,
        db: Session,
        transaction: Transaction,
        amount_to_capture: Optional[Decimal] = None
    ) -> bool:
        """Capture payment (release from escrow)"""
        
        try:
            if transaction.status != TransactionStatus.REQUIRES_CAPTURE:
                logger.warning(f"Cannot capture transaction {transaction.id} in status {transaction.status}")
                return False
            
            # Set correct Stripe key
            self.set_stripe_key(transaction.region)
            
            capture_amount = amount_to_capture or transaction.escrow_amount
            
            # Capture the Payment Intent
            payment_intent = stripe.PaymentIntent.capture(
                transaction.stripe_payment_intent_id,
                amount_to_capture=int(capture_amount * 100) if amount_to_capture else None
            )
            
            if payment_intent.status == 'succeeded':
                transaction.status = TransactionStatus.CAPTURED
                transaction.captured_at = datetime.utcnow()
                transaction.escrow_released_amount = capture_amount
                
                # If using Stripe Connect, transfer happens automatically
                if transaction.manufacturer and hasattr(transaction.manufacturer, 'stripe_connect_account'):
                    transaction.payout_initiated_at = datetime.utcnow()
                    transaction.payout_succeeded_at = datetime.utcnow()
                
                db.commit()
                
                logger.info(f"Payment captured for transaction {transaction.id}")
                return True
            else:
                logger.error(f"Failed to capture transaction {transaction.id}")
                return False
                
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error capturing payment: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"Error capturing payment: {str(e)}")
            return False
    
    async def refund_payment(
        self,
        db: Session,
        transaction: Transaction,
        amount: Optional[Decimal] = None,
        reason: str = "requested_by_customer"
    ) -> bool:
        """Process payment refund"""
        
        try:
            if transaction.status not in [TransactionStatus.SUCCEEDED, TransactionStatus.CAPTURED]:
                logger.warning(f"Cannot refund transaction {transaction.id} in status {transaction.status}")
                return False
            
            # Set correct Stripe key
            self.set_stripe_key(transaction.region)
            
            refund_amount = amount or (transaction.gross_amount - transaction.refund_amount)
            
            # Create refund in Stripe
            refund = stripe.Refund.create(
                payment_intent=transaction.stripe_payment_intent_id,
                amount=int(refund_amount * 100),
                reason=reason,
                metadata={
                    'transaction_id': str(transaction.id),
                    'order_id': str(transaction.order_id) if transaction.order_id else None
                }
            )
            
            if refund.status == 'succeeded':
                transaction.refund_amount += refund_amount
                transaction.refund_processed_at = datetime.utcnow()
                
                if not transaction.stripe_refund_id:
                    transaction.stripe_refund_id = refund.id
                
                # Update status if fully refunded
                if transaction.refund_amount >= transaction.gross_amount:
                    transaction.status = TransactionStatus.REFUNDED
                else:
                    transaction.status = TransactionStatus.PARTIALLY_REFUNDED
                
                db.commit()
                
                logger.info(f"Refund processed for transaction {transaction.id}: {refund_amount}")
                return True
            else:
                logger.error(f"Failed to process refund for transaction {transaction.id}")
                return False
                
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error processing refund: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"Error processing refund: {str(e)}")
            return False
    
    # ... (Continue with Connect account management, subscriptions, invoices, webhooks, etc.)
    
    async def create_connect_account(
        self,
        db: Session,
        manufacturer,
        account_type: ConnectAccountType = ConnectAccountType.EXPRESS,
        country: str = 'US'
    ) -> Optional[StripeConnectAccount]:
        """Create Stripe Connect account for manufacturer"""
        
        try:
            region = self.detect_region(country)
            self.set_stripe_key(region)
            
            # Create Stripe Connect account
            account_params = {
                'type': account_type.value,
                'country': country,
                'email': manufacturer.email,
                'business_type': 'company' if manufacturer.business_type == 'company' else 'individual',
                'metadata': {
                    'manufacturer_id': str(manufacturer.id),
                    'region': region.value
                }
            }
            
            if account_type == ConnectAccountType.EXPRESS:
                account_params['capabilities'] = {
                    'card_payments': {'requested': True},
                    'transfers': {'requested': True}
                }
            
            stripe_account = stripe.Account.create(**account_params)
            
            # Create database record
            connect_account = StripeConnectAccount(
                manufacturer_id=manufacturer.id,
                stripe_account_id=stripe_account.id,
                account_type=account_type,
                country=country,
                region=region,
                default_currency=stripe_account.default_currency.upper(),
                charges_enabled=stripe_account.charges_enabled,
                payouts_enabled=stripe_account.payouts_enabled,
                details_submitted=stripe_account.details_submitted
            )
            
            db.add(connect_account)
            db.commit()
            
            logger.info(f"Connect account created for manufacturer {manufacturer.id}: {stripe_account.id}")
            return connect_account
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating Connect account: {str(e)}")
            db.rollback()
            return None
        except Exception as e:
            logger.error(f"Error creating Connect account: {str(e)}")
            db.rollback()
            return None
    
    def verify_webhook_signature(self, payload: bytes, sig_header: str, region: PaymentRegion) -> bool:
        """Verify Stripe webhook signature"""
        try:
            config = self.get_stripe_config(region)
            webhook_secret = config['webhook_secret']
            
            stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
            return True
        except Exception as e:
            logger.error(f"Webhook signature verification failed: {str(e)}")
            return False
    
    async def handle_webhook(
        self,
        db: Session,
        event_type: str,
        event_data: Dict[str, Any],
        stripe_event_id: str
    ) -> bool:
        """Process Stripe webhook events"""
        
        try:
            # Check if event already processed
            existing_event = db.query(WebhookEvent).filter(
                WebhookEvent.stripe_event_id == stripe_event_id
            ).first()
            
            if existing_event and existing_event.processed:
                logger.info(f"Webhook event {stripe_event_id} already processed")
                return True
            
            # Create or update webhook event record
            if not existing_event:
                webhook_event = WebhookEvent(
                    stripe_event_id=stripe_event_id,
                    event_type=event_type,
                    event_data=event_data
                )
                db.add(webhook_event)
            else:
                webhook_event = existing_event
                webhook_event.processing_attempts += 1
            
            # Process different event types
            success = False
            
            if event_type.startswith('payment_intent.'):
                success = await self._handle_payment_intent_webhook(db, event_type, event_data)
            elif event_type.startswith('account.'):
                success = await self._handle_account_webhook(db, event_type, event_data)
            elif event_type.startswith('invoice.'):
                success = await self._handle_invoice_webhook(db, event_type, event_data)
            elif event_type.startswith('customer.subscription.'):
                success = await self._handle_subscription_webhook(db, event_type, event_data)
            else:
                logger.info(f"Unhandled webhook event type: {event_type}")
                success = True  # Mark as processed to avoid retries
            
            # Update processing status
            webhook_event.processed = success
            if success:
                webhook_event.processed_at = datetime.utcnow()
            else:
                webhook_event.last_error = f"Failed to process {event_type}"
            
            db.commit()
            return success
            
        except Exception as e:
            logger.error(f"Error handling webhook {stripe_event_id}: {str(e)}")
            if 'webhook_event' in locals():
                webhook_event.last_error = str(e)
                db.commit()
            return False
    
    async def _handle_payment_intent_webhook(
        self, 
        db: Session, 
        event_type: str, 
        event_data: Dict[str, Any]
    ) -> bool:
        """Handle payment intent webhook events"""
        
        payment_intent = event_data.get('object', {})
        payment_intent_id = payment_intent.get('id')
        
        if not payment_intent_id:
            return False
        
        transaction = db.query(Transaction).filter(
            Transaction.stripe_payment_intent_id == payment_intent_id
        ).first()
        
        if not transaction:
            logger.warning(f"Transaction not found for payment intent {payment_intent_id}")
            return True  # Not our transaction, but don't retry
        
        if event_type == 'payment_intent.succeeded':
            transaction.status = TransactionStatus.SUCCEEDED
            transaction.authorized_at = datetime.utcnow()
            
            if transaction.order:
                transaction.order.status = OrderStatus.PAYMENT_COMPLETED
                
        elif event_type == 'payment_intent.requires_action':
            transaction.status = TransactionStatus.REQUIRES_ACTION
            
        elif event_type == 'payment_intent.payment_failed':
            transaction.status = TransactionStatus.FAILED
            transaction.failed_at = datetime.utcnow()
            
            last_error = payment_intent.get('last_payment_error', {})
            transaction.failure_reason = last_error.get('message')
            transaction.failure_code = last_error.get('code')
        
        db.commit()
        return True 

# Alias for backward compatibility with tests
PaymentService = MultiRegionStripeService 
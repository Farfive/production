from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Enum, Text, Numeric, Boolean, JSON, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum as PyEnum
from typing import Dict, List, Any, Optional
from decimal import Decimal
import uuid

from app.core.database import Base
from app.models.financial import Invoice as _Invoice


class TransactionStatus(PyEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    AUTHORIZED = "authorized"
    CAPTURED = "captured"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"
    DISPUTED = "disputed"
    CHARGEBACK = "chargeback"
    REQUIRES_ACTION = "requires_action"
    REQUIRES_CAPTURE = "requires_capture"
    REQUIRES_CONFIRMATION = "requires_confirmation"
    REQUIRES_PAYMENT_METHOD = "requires_payment_method"


class TransactionType(PyEnum):
    ORDER_PAYMENT = "order_payment"
    COMMISSION = "commission"
    PAYOUT = "payout"
    REFUND = "refund"
    DISPUTE_RESOLUTION = "dispute_resolution"
    CHARGEBACK = "chargeback"
    ADJUSTMENT = "adjustment"
    SUBSCRIPTION = "subscription"
    INVOICE = "invoice"
    MARKETPLACE_SPLIT = "marketplace_split"
    ESCROW_RELEASE = "escrow_release"


class PaymentMethod(PyEnum):
    CARD = "card"
    SEPA_DEBIT = "sepa_debit"
    ACH_DEBIT = "ach_debit"
    BANCONTACT = "bancontact"
    IDEAL = "ideal"
    SOFORT = "sofort"
    GIROPAY = "giropay"
    P24 = "p24"
    EPS = "eps"
    ALIPAY = "alipay"
    WECHAT_PAY = "wechat_pay"
    AFTERPAY_CLEARPAY = "afterpay_clearpay"
    KLARNA = "klarna"
    APPLE_PAY = "apple_pay"
    GOOGLE_PAY = "google_pay"
    PAYPAL = "paypal"
    BANK_TRANSFER = "bank_transfer"
    CRYPTOCURRENCY = "cryptocurrency"
    OTHER = "other"


class PaymentRegion(PyEnum):
    US = "us"
    EU = "eu"
    UK = "uk"
    CA = "ca"
    AU = "au"
    SG = "sg"
    JP = "jp"
    OTHER = "other"


class ConnectAccountType(PyEnum):
    STANDARD = "standard"
    EXPRESS = "express"
    CUSTOM = "custom"


class SubscriptionStatus(PyEnum):
    ACTIVE = "active"
    PAST_DUE = "past_due"
    UNPAID = "unpaid"
    CANCELED = "canceled"
    INCOMPLETE = "incomplete"
    INCOMPLETE_EXPIRED = "incomplete_expired"
    TRIALING = "trialing"
    PAUSED = "paused"


# Enhanced Transaction Model
class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    
    # Core references
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True, index=True)
    quote_id = Column(Integer, ForeignKey("quotes.id"), nullable=True, index=True)
    client_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    manufacturer_id = Column(Integer, ForeignKey("manufacturers.id"), nullable=True, index=True)
    
    # Transaction identification
    transaction_number = Column(String(50), unique=True, nullable=False, index=True, default=lambda: str(uuid.uuid4())[:8])
    external_transaction_id = Column(String(255), nullable=True, index=True)  # Stripe Payment Intent ID
    idempotency_key = Column(String(255), nullable=True, unique=True, index=True)
    
    # Transaction details
    transaction_type = Column(Enum(TransactionType), nullable=False, index=True)
    status = Column(Enum(TransactionStatus), default=TransactionStatus.PENDING, index=True)
    
    # Payment method information
    payment_method_type = Column(Enum(PaymentMethod), nullable=True)
    payment_method_details = Column(JSON, nullable=True, default=dict)
    # {"card_last4": "4242", "card_brand": "visa", "card_country": "US", "card_funding": "credit"}
    
    # Regional and currency information
    region = Column(Enum(PaymentRegion), nullable=False, index=True)
    original_currency = Column(String(3), nullable=False, default="USD")  # ISO 4217
    platform_currency = Column(String(3), nullable=False, default="USD")  # Platform's base currency
    
    # Original amount (in customer's currency)
    original_amount = Column(Numeric(15, 2), nullable=False)
    
    # Platform currency amounts
    gross_amount = Column(Numeric(15, 2), nullable=False)  # Total amount in platform currency
    net_amount = Column(Numeric(15, 2), nullable=False)  # Amount after all fees
    
    # Commission and fee breakdown
    platform_commission_rate_pct = Column(Numeric(5, 2), default=10.00)
    platform_commission_amount = Column(Numeric(12, 2), nullable=False)
    
    # Processing fees
    stripe_fee_amount = Column(Numeric(8, 2), default=0.00)
    cross_border_fee_amount = Column(Numeric(8, 2), default=0.00)
    currency_conversion_fee_amount = Column(Numeric(8, 2), default=0.00)
    
    # Tax handling
    tax_rate_pct = Column(Numeric(5, 2), default=0.00)
    tax_amount = Column(Numeric(12, 2), nullable=False, default=0)
    tax_included = Column(Boolean, default=True)
    tax_jurisdiction = Column(String(50), nullable=True)  # e.g., "US-CA", "EU-DE"
    
    # Manufacturer payout
    manufacturer_payout_amount = Column(Numeric(15, 2), nullable=False)
    manufacturer_payout_currency = Column(String(3), nullable=False, default="USD")
    
    # Escrow functionality
    escrow_amount = Column(Numeric(15, 2), default=0.00)
    escrow_release_date = Column(DateTime(timezone=True), nullable=True)
    escrow_released_amount = Column(Numeric(15, 2), default=0.00)
    
    # Exchange rates
    exchange_rate = Column(Numeric(10, 6), default=1.000000)
    exchange_rate_timestamp = Column(DateTime(timezone=True), nullable=True)
    
    # Stripe integration
    stripe_payment_intent_id = Column(String(255), nullable=True, index=True)
    stripe_transfer_id = Column(String(255), nullable=True, index=True)
    stripe_charge_id = Column(String(255), nullable=True, index=True)
    stripe_refund_id = Column(String(255), nullable=True, index=True)
    stripe_invoice_id = Column(String(255), nullable=True, index=True)
    stripe_subscription_id = Column(String(255), nullable=True, index=True)
    
    # Multi-entity Stripe accounts
    stripe_account_id = Column(String(255), nullable=True, index=True)  # Regional Stripe account
    
    # 3D Secure and SCA
    three_d_secure_status = Column(String(50), nullable=True)
    sca_required = Column(Boolean, default=False)
    sca_completed = Column(Boolean, default=False)
    
    # Fraud detection
    fraud_score = Column(Integer, nullable=True)  # 0-100
    fraud_outcome = Column(String(50), nullable=True)  # approved, declined, manual_review
    
    # Timeline tracking
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Payment processing timestamps
    authorized_at = Column(DateTime(timezone=True), nullable=True)
    captured_at = Column(DateTime(timezone=True), nullable=True)
    failed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Payout tracking
    payout_initiated_at = Column(DateTime(timezone=True), nullable=True)
    payout_succeeded_at = Column(DateTime(timezone=True), nullable=True)
    payout_failed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Refund tracking
    refund_requested_at = Column(DateTime(timezone=True), nullable=True)
    refund_processed_at = Column(DateTime(timezone=True), nullable=True)
    refund_amount = Column(Numeric(15, 2), default=0.0)
    
    # Error handling
    failure_reason = Column(String(500), nullable=True)
    failure_code = Column(String(100), nullable=True)
    last_error = Column(JSON, nullable=True)
    
    # Metadata and notes
    payment_metadata = Column(JSON, nullable=True, default=dict)
    admin_notes = Column(Text, nullable=True)
    
    # Relationships
    order = relationship("Order", back_populates="transactions")
    quote = relationship("Quote", back_populates="transactions")
    client = relationship("User", back_populates="transactions_as_client", foreign_keys=[client_id])
    manufacturer = relationship("Manufacturer", back_populates="transactions_as_manufacturer", foreign_keys=[manufacturer_id])
    
    # Indexes
    __table_args__ = (
        Index('idx_transaction_stripe_payment_intent', 'stripe_payment_intent_id'),
        Index('idx_transaction_region_currency', 'region', 'original_currency'),
        Index('idx_transaction_status_type', 'status', 'transaction_type'),
        Index('idx_transaction_created_at', 'created_at'),
    )
    
    def __repr__(self):
        return f"<Transaction(id={self.id}, order_id={self.order_id}, amount={self.gross_amount}, status={self.status})>"


# Stripe Connect Account Model
class StripeConnectAccount(Base):
    __tablename__ = "stripe_connect_accounts"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # References
    manufacturer_id = Column(Integer, ForeignKey("manufacturers.id"), nullable=False, unique=True, index=True)
    
    # Stripe Connect details
    stripe_account_id = Column(String(255), nullable=False, unique=True, index=True)
    account_type = Column(Enum(ConnectAccountType), nullable=False)
    
    # Account status
    charges_enabled = Column(Boolean, default=False)
    payouts_enabled = Column(Boolean, default=False)
    details_submitted = Column(Boolean, default=False)
    
    # Regional information
    country = Column(String(2), nullable=False)  # ISO 3166-1 alpha-2
    region = Column(Enum(PaymentRegion), nullable=False)
    default_currency = Column(String(3), nullable=False)
    
    # Verification status
    identity_verified = Column(Boolean, default=False)
    business_verified = Column(Boolean, default=False)
    
    # Requirements
    currently_due = Column(JSON, nullable=True, default=list)
    eventually_due = Column(JSON, nullable=True, default=list)
    past_due = Column(JSON, nullable=True, default=list)
    
    # Payout settings
    payout_schedule = Column(JSON, nullable=True, default=dict)
    # {"interval": "daily", "delay_days": 2}
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    manufacturer = relationship("Manufacturer", back_populates="stripe_connect_account")
    

# Subscription Model for Enterprise/SaaS Features
class Subscription(Base):
    __tablename__ = "subscriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # References
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    manufacturer_id = Column(Integer, ForeignKey("manufacturers.id"), nullable=True, index=True)
    
    # Stripe subscription details
    stripe_subscription_id = Column(String(255), nullable=False, unique=True, index=True)
    stripe_customer_id = Column(String(255), nullable=False, index=True)
    stripe_price_id = Column(String(255), nullable=False)
    
    # Subscription details
    status = Column(Enum(SubscriptionStatus), nullable=False, index=True)
    plan_name = Column(String(100), nullable=False)
    
    # Pricing
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), nullable=False)
    interval = Column(String(20), nullable=False)  # month, year
    interval_count = Column(Integer, default=1)
    
    # Trial
    trial_start = Column(DateTime(timezone=True), nullable=True)
    trial_end = Column(DateTime(timezone=True), nullable=True)
    
    # Billing
    current_period_start = Column(DateTime(timezone=True), nullable=False)
    current_period_end = Column(DateTime(timezone=True), nullable=False)
    
    # Cancellation
    cancel_at_period_end = Column(Boolean, default=False)
    canceled_at = Column(DateTime(timezone=True), nullable=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="subscriptions")
    manufacturer = relationship("Manufacturer", back_populates="subscriptions")


# Note: Invoice model is now defined in financial.py to avoid duplicates
# Import it here for relationships if needed
# from app.models.financial import Invoice


# Webhook Event Log for Stripe Events
class WebhookEvent(Base):
    __tablename__ = "webhook_events"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Event details
    stripe_event_id = Column(String(255), nullable=False, unique=True, index=True)
    event_type = Column(String(100), nullable=False, index=True)
    
    # Processing status
    processed = Column(Boolean, default=False, index=True)
    processing_attempts = Column(Integer, default=0)
    
    # Event data
    event_data = Column(JSON, nullable=False)
    
    # Error handling
    last_error = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Indexes
    __table_args__ = (
        Index('idx_webhook_event_type_processed', 'event_type', 'processed'),
        Index('idx_webhook_created_at', 'created_at'),
    )


# Simple alias for backward compatibility – tests reference Payment
Payment = Transaction 
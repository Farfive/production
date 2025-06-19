from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
import uuid
from enum import Enum

from .base import Base


class SubscriptionTier(str, Enum):
    FREE = "FREE"
    BASIC = "BASIC"
    PREMIUM = "PREMIUM"
    ENTERPRISE = "ENTERPRISE"


class SubscriptionStatus(str, Enum):
    ACTIVE = "ACTIVE"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"
    SUSPENDED = "SUSPENDED"
    PENDING = "PENDING"


class BillingCycle(str, Enum):
    MONTHLY = "MONTHLY"
    QUARTERLY = "QUARTERLY"
    YEARLY = "YEARLY"


class ClientSubscription(Base):
    """
    Client subscription system with tiered benefits and commission discounts.
    """
    __tablename__ = "client_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(String(36), default=lambda: str(uuid.uuid4()), unique=True, index=True)
    
    # User relationship
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Subscription details
    tier = Column(SQLEnum(SubscriptionTier), nullable=False)
    status = Column(SQLEnum(SubscriptionStatus), default=SubscriptionStatus.PENDING)
    billing_cycle = Column(SQLEnum(BillingCycle), default=BillingCycle.MONTHLY)
    
    # Pricing
    monthly_price = Column(Float, nullable=False)
    annual_price = Column(Float, nullable=True)
    current_price = Column(Float, nullable=False)  # Actual price being paid
    
    # Benefits and limits
    commission_discount = Column(Float, default=0.0)  # Discount on 8% commission
    monthly_order_limit = Column(Integer, nullable=True)  # Max orders per month
    priority_support = Column(Boolean, default=False)
    advanced_analytics = Column(Boolean, default=False)
    api_access = Column(Boolean, default=False)
    custom_branding = Column(Boolean, default=False)
    dedicated_manager = Column(Boolean, default=False)
    
    # Usage tracking
    orders_this_month = Column(Integer, default=0)
    total_orders = Column(Integer, default=0)
    total_spent = Column(Float, default=0.0)
    commission_saved = Column(Float, default=0.0)
    
    # Billing and payment
    next_billing_date = Column(DateTime, nullable=False)
    last_payment_date = Column(DateTime, nullable=True)
    payment_method_id = Column(String(255), nullable=True)  # Stripe payment method
    
    # Trial and promotions
    trial_ends_at = Column(DateTime, nullable=True)
    is_trial = Column(Boolean, default=False)
    promo_code = Column(String(50), nullable=True)
    promo_discount = Column(Float, default=0.0)
    
    # Lifecycle
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    cancelled_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    
    # Metadata
    meta_json = Column('metadata', JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="subscription")
    payments = relationship("SubscriptionPayment", back_populates="subscription")
    
    @property
    def is_active(self) -> bool:
        """Check if subscription is currently active."""
        return (
            self.status == SubscriptionStatus.ACTIVE and
            (self.expires_at is None or self.expires_at > datetime.utcnow())
        )
    
    @property
    def days_until_renewal(self) -> int:
        """Days until next billing."""
        if self.next_billing_date:
            delta = self.next_billing_date - datetime.utcnow()
            return max(0, delta.days)
        return 0
    
    def get_effective_commission_rate(self, base_rate: float = 0.08) -> float:
        """Get effective commission rate after subscription discount."""
        if not self.is_active:
            return base_rate
        
        return base_rate * (1 - self.commission_discount)
    
    def can_place_order(self) -> bool:
        """Check if user can place another order this month."""
        if not self.monthly_order_limit:
            return True
        
        return self.orders_this_month < self.monthly_order_limit
    
    def increment_usage(self, order_value: float):
        """Increment usage counters."""
        self.orders_this_month += 1
        self.total_orders += 1
        self.total_spent += order_value
        
        # Calculate commission saved
        base_commission = order_value * 0.08
        discounted_commission = order_value * self.get_effective_commission_rate()
        self.commission_saved += (base_commission - discounted_commission)


class SubscriptionPlan(Base):
    """
    Available subscription plans and their features.
    """
    __tablename__ = "subscription_plans"

    id = Column(Integer, primary_key=True, index=True)
    
    # Plan details
    tier = Column(SQLEnum(SubscriptionTier), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    
    # Pricing
    monthly_price = Column(Float, nullable=False)
    annual_price = Column(Float, nullable=True)
    annual_discount = Column(Float, default=0.0)  # Discount for annual billing
    
    # Features and limits
    commission_discount = Column(Float, default=0.0)
    monthly_order_limit = Column(Integer, nullable=True)
    priority_support = Column(Boolean, default=False)
    advanced_analytics = Column(Boolean, default=False)
    api_access = Column(Boolean, default=False)
    custom_branding = Column(Boolean, default=False)
    dedicated_manager = Column(Boolean, default=False)
    
    # Additional features
    features = Column(JSON, nullable=True)  # Flexible feature list
    
    # Trial settings
    trial_days = Column(Integer, default=0)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)
    
    # Display
    display_order = Column(Integer, default=0)
    color_scheme = Column(String(50), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SubscriptionPayment(Base):
    """
    Subscription payment history and billing records.
    """
    __tablename__ = "subscription_payments"

    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(String(36), default=lambda: str(uuid.uuid4()), unique=True, index=True)
    
    # Relationships
    subscription_id = Column(Integer, ForeignKey("client_subscriptions.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Payment details
    amount = Column(Float, nullable=False)
    currency = Column(String(3), default="USD", nullable=False)
    billing_cycle = Column(SQLEnum(BillingCycle), nullable=False)
    
    # Payment processing
    payment_method = Column(String(50), nullable=False)  # stripe, paypal, etc.
    payment_reference = Column(String(255), nullable=True)  # External payment ID
    payment_status = Column(String(50), default="pending", nullable=False)
    
    # Billing period
    billing_period_start = Column(DateTime, nullable=False)
    billing_period_end = Column(DateTime, nullable=False)
    
    # Discounts and adjustments
    base_amount = Column(Float, nullable=False)
    discount_amount = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    
    # Processing
    processed_at = Column(DateTime, nullable=True)
    failed_at = Column(DateTime, nullable=True)
    failure_reason = Column(Text, nullable=True)
    
    # Metadata
    meta_json = Column('metadata', JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    subscription = relationship("ClientSubscription", back_populates="payments")
    user = relationship("User")


class SubscriptionUsage(Base):
    """
    Monthly usage tracking for subscription limits and analytics.
    """
    __tablename__ = "subscription_usage"

    id = Column(Integer, primary_key=True, index=True)
    
    # Relationships
    subscription_id = Column(Integer, ForeignKey("client_subscriptions.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Period
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    
    # Usage metrics
    orders_placed = Column(Integer, default=0)
    total_order_value = Column(Float, default=0.0)
    commission_paid = Column(Float, default=0.0)
    commission_saved = Column(Float, default=0.0)
    
    # Feature usage
    api_calls = Column(Integer, default=0)
    support_tickets = Column(Integer, default=0)
    analytics_views = Column(Integer, default=0)
    
    # Calculated at month end
    is_finalized = Column(Boolean, default=False)
    finalized_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    subscription = relationship("ClientSubscription")
    user = relationship("User")


class PromoCode(Base):
    """
    Promotional codes for subscription discounts.
    """
    __tablename__ = "promo_codes"

    id = Column(Integer, primary_key=True, index=True)
    
    # Code details
    code = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    
    # Discount
    discount_type = Column(String(20), nullable=False)  # percentage, fixed
    discount_value = Column(Float, nullable=False)
    max_discount = Column(Float, nullable=True)  # Cap for percentage discounts
    
    # Validity
    valid_from = Column(DateTime, default=datetime.utcnow, nullable=False)
    valid_until = Column(DateTime, nullable=True)
    
    # Usage limits
    max_uses = Column(Integer, nullable=True)
    max_uses_per_user = Column(Integer, default=1)
    current_uses = Column(Integer, default=0)
    
    # Restrictions
    applicable_tiers = Column(JSON, nullable=True)  # Which tiers can use this code
    minimum_order_value = Column(Float, nullable=True)
    first_time_only = Column(Boolean, default=False)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def is_valid(self, user_id: int = None, tier: SubscriptionTier = None) -> bool:
        """Check if promo code is valid for use."""
        now = datetime.utcnow()
        
        # Basic validity checks
        if not self.is_active:
            return False
        
        if now < self.valid_from:
            return False
        
        if self.valid_until and now > self.valid_until:
            return False
        
        if self.max_uses and self.current_uses >= self.max_uses:
            return False
        
        # Tier restrictions
        if self.applicable_tiers and tier:
            if tier.value not in self.applicable_tiers:
                return False
        
        return True
    
    def calculate_discount(self, amount: float) -> float:
        """Calculate discount amount for given subscription amount."""
        if self.discount_type == "percentage":
            discount = amount * (self.discount_value / 100)
            if self.max_discount:
                discount = min(discount, self.max_discount)
            return discount
        elif self.discount_type == "fixed":
            return min(self.discount_value, amount)
        
        return 0.0 
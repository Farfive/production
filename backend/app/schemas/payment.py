from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from decimal import Decimal
from datetime import datetime


class PaymentIntentCreate(BaseModel):
    """Request model for creating a payment intent"""
    amount: Decimal
    currency: str = "usd"
    create_customer: bool = False
    metadata: Optional[Dict[str, Any]] = None


class PaymentIntentResponse(BaseModel):
    """Response model for payment intent creation"""
    payment_intent_id: str
    client_secret: str
    amount: Decimal
    currency: str
    status: str


class PaymentProcessRequest(BaseModel):
    """Request model for processing order payment"""
    order_id: int
    quote_id: int
    payment_method_id: str
    save_payment_method: bool = False


class PaymentResponse(BaseModel):
    """Response model for payment processing"""
    payment_id: int
    payment_intent_id: str
    status: str
    amount: float
    requires_action: bool
    client_secret: Optional[str] = None


class PaymentMethodCard(BaseModel):
    """Card details for payment method"""
    brand: str
    last4: str
    exp_month: int
    exp_year: int


class PaymentMethodResponse(BaseModel):
    """Response model for payment methods"""
    id: str
    type: str
    card: Optional[PaymentMethodCard] = None
    created: datetime


class SetupIntentResponse(BaseModel):
    """Response model for setup intent creation"""
    setup_intent_id: str
    client_secret: str
    status: str


class PaymentHistoryResponse(BaseModel):
    """Response model for payment history"""
    id: int
    amount: float
    currency: str
    status: str
    payment_method: str
    created_at: datetime
    order_id: int
    quote_id: int
    refund_amount: Optional[float] = None
    refund_reason: Optional[str] = None
    refunded_at: Optional[datetime] = None


class RefundRequest(BaseModel):
    """Request model for payment refund"""
    payment_id: int
    amount: Optional[Decimal] = None
    reason: str = "requested_by_customer"


class RefundResponse(BaseModel):
    """Response model for refund processing"""
    refund_id: str
    amount: Decimal
    status: str
    reason: str


class SubscriptionCreate(BaseModel):
    """Request model for subscription creation"""
    price_id: str
    trial_period_days: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None


class SubscriptionResponse(BaseModel):
    """Response model for subscription creation"""
    subscription_id: str
    status: str
    current_period_start: datetime
    current_period_end: datetime
    client_secret: Optional[str] = None


class PaymentAnalytics(BaseModel):
    """Payment analytics summary"""
    total_payments: int
    total_amount: float
    successful_payments: int
    failed_payments: int
    refunded_payments: int
    average_payment: float
    success_rate: float


class WebhookEvent(BaseModel):
    """Webhook event data"""
    event_type: str
    status: str
    message: Optional[str] = None
    payment_updated: Optional[bool] = None 
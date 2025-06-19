from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


class EscrowStatusEnum(str, Enum):
    PENDING = "PENDING"
    FUNDED = "FUNDED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    DISPUTED = "DISPUTED"
    CANCELLED = "CANCELLED"
    REFUNDED = "REFUNDED"


class PaymentMethodEnum(str, Enum):
    BANK_TRANSFER = "BANK_TRANSFER"
    CREDIT_CARD = "CREDIT_CARD"
    PAYPAL = "PAYPAL"
    STRIPE = "STRIPE"
    CRYPTO = "CRYPTO"


class MandatoryEscrowResponse(BaseModel):
    escrow_required: bool
    escrow_id: Optional[int] = None
    total_amount: Optional[float] = None
    commission: Optional[float] = None
    manufacturer_payout: Optional[float] = None
    payment_deadline: Optional[datetime] = None
    status: Optional[str] = None
    enforcement_level: Optional[str] = None
    reason: Optional[str] = None

    class Config:
        from_attributes = True


class EscrowPaymentRequest(BaseModel):
    payment_reference: str = Field(..., description="Payment reference from payment processor")
    payment_method: Optional[PaymentMethodEnum] = PaymentMethodEnum.BANK_TRANSFER
    verification_data: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class EscrowEnforcementStats(BaseModel):
    total_mandatory_escrows: int
    successful_payments: int
    expired_quotes: int
    payment_success_rate: float
    total_commission_secured: float
    enforcement_effectiveness: str

    class Config:
        from_attributes = True


class BypassDetectionRequest(BaseModel):
    message_content: str = Field(..., description="Message content to analyze for bypass attempts")
    detection_context: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class PaymentEscrowMilestoneResponse(BaseModel):
    id: int
    milestone_name: str
    milestone_description: Optional[str] = None
    milestone_amount: float
    milestone_percentage: float
    is_completed: bool
    completed_at: Optional[datetime] = None
    verified_by_client: bool
    verified_by_platform: bool
    expected_completion_date: Optional[datetime] = None
    actual_completion_date: Optional[datetime] = None

    class Config:
        from_attributes = True


class EscrowTransactionResponse(BaseModel):
    id: int
    transaction_id: str
    order_id: int
    quote_id: Optional[int] = None
    client_id: int
    manufacturer_id: int
    total_amount: float
    platform_commission: float
    manufacturer_payout: float
    payment_method: PaymentMethodEnum
    payment_reference: Optional[str] = None
    status: EscrowStatusEnum
    funded_at: Optional[datetime] = None
    released_at: Optional[datetime] = None
    release_conditions: Optional[Dict[str, Any]] = None
    milestone_payments: Optional[Dict[str, Any]] = None
    additional_metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    milestones: Optional[List[PaymentEscrowMilestoneResponse]] = None

    class Config:
        from_attributes = True


class EscrowCreate(BaseModel):
    order_id: int
    quote_id: Optional[int] = None
    client_id: int
    manufacturer_id: int
    total_amount: float
    payment_method: PaymentMethodEnum = PaymentMethodEnum.BANK_TRANSFER
    release_conditions: Optional[Dict[str, Any]] = None
    milestone_payments: Optional[Dict[str, Any]] = None
    additional_metadata: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class EscrowUpdate(BaseModel):
    status: Optional[EscrowStatusEnum] = None
    payment_reference: Optional[str] = None
    release_conditions: Optional[Dict[str, Any]] = None
    milestone_payments: Optional[Dict[str, Any]] = None
    additional_metadata: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class PaymentReminderResponse(BaseModel):
    id: int
    escrow_id: int
    reminder_type: str
    scheduled_for: datetime
    is_sent: bool
    sent_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True 
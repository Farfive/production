from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from enum import Enum

from .base import Base


class EscrowStatus(str, Enum):
    PENDING = "PENDING"
    FUNDED = "FUNDED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    DISPUTED = "DISPUTED"
    CANCELLED = "CANCELLED"
    REFUNDED = "REFUNDED"


class PaymentMethod(str, Enum):
    BANK_TRANSFER = "BANK_TRANSFER"
    CREDIT_CARD = "CREDIT_CARD"
    PAYPAL = "PAYPAL"
    STRIPE = "STRIPE"
    CRYPTO = "CRYPTO"


class EscrowTransaction(Base):
    """
    Escrow system to secure payments and ensure platform commission collection.
    All payments must go through this system to prevent bypass.
    """
    __tablename__ = "escrow_transactions"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(String(36), default=lambda: str(uuid.uuid4()), unique=True, index=True)
    
    # Related entities
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    quote_id = Column(Integer, ForeignKey("quotes.id"), nullable=True)
    client_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    manufacturer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Financial details
    total_amount = Column(Float, nullable=False)  # Total project value
    platform_commission = Column(Float, nullable=False)  # 8% commission
    manufacturer_payout = Column(Float, nullable=False)  # Amount to manufacturer
    
    # Payment details
    payment_method = Column(SQLEnum(PaymentMethod), nullable=False)
    payment_reference = Column(String(255), nullable=True)  # External payment ID
    
    # Status and timeline
    status = Column(SQLEnum(EscrowStatus), default=EscrowStatus.PENDING, nullable=False)
    funded_at = Column(DateTime, nullable=True)
    released_at = Column(DateTime, nullable=True)
    
    # Milestones and conditions
    release_conditions = Column(JSON, nullable=True)  # Conditions for fund release
    milestone_payments = Column(JSON, nullable=True)  # Milestone-based payments
    
    # Security and verification
    client_verification_required = Column(Boolean, default=True)
    manufacturer_verification_required = Column(Boolean, default=True)
    platform_approval_required = Column(Boolean, default=True)
    
    # Dispute handling
    dispute_reason = Column(Text, nullable=True)
    dispute_resolution = Column(Text, nullable=True)
    disputed_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    
    # Additional metadata
    additional_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    order = relationship("Order", back_populates="escrow_transactions")
    quote = relationship("Quote", back_populates="escrow_transactions")
    client = relationship("User", foreign_keys=[client_id])
    manufacturer = relationship("User", foreign_keys=[manufacturer_id])
    milestones = relationship("app.models.payment_escrow.PaymentEscrowMilestone", back_populates="escrow_transaction")
    communication_blocks = relationship("CommunicationBlock", back_populates="escrow")
    payment_reminders = relationship("PaymentReminder", back_populates="escrow")
    
    def calculate_commission(self, total_amount: float, commission_rate: float = 0.08) -> dict:
        """Calculate platform commission and manufacturer payout."""
        commission = total_amount * commission_rate
        manufacturer_payout = total_amount - commission
        
        return {
            "total_amount": total_amount,
            "platform_commission": commission,
            "manufacturer_payout": manufacturer_payout,
            "commission_rate": commission_rate
        }
    
    def can_release_funds(self) -> bool:
        """Check if funds can be released to manufacturer."""
        if self.status != EscrowStatus.FUNDED:
            return False
        
        # Check if all release conditions are met
        if self.release_conditions:
            # Implementation would check specific conditions
            pass
        
        # Check milestone completion
        if self.milestone_payments:
            completed_milestones = [m for m in self.milestones if m.is_completed]
            total_milestones = len(self.milestones)
            if len(completed_milestones) < total_milestones:
                return False
        
        return True


class PaymentEscrowMilestone(Base):
    """
    Milestone-based payment system for large projects.
    """
    __tablename__ = "payment_escrow_milestones"  # Renamed to avoid conflict

    id = Column(Integer, primary_key=True, index=True)
    escrow_transaction_id = Column(Integer, ForeignKey("escrow_transactions.id"), nullable=False)
    
    # Milestone details
    milestone_name = Column(String(255), nullable=False)
    milestone_description = Column(Text, nullable=True)
    milestone_amount = Column(Float, nullable=False)
    milestone_percentage = Column(Float, nullable=False)  # Percentage of total
    
    # Status and verification
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    verified_by_client = Column(Boolean, default=False)
    verified_by_platform = Column(Boolean, default=False)
    
    # Evidence and documentation
    completion_evidence = Column(JSON, nullable=True)  # Photos, documents, etc.
    client_approval_notes = Column(Text, nullable=True)
    platform_review_notes = Column(Text, nullable=True)
    
    # Timeline
    expected_completion_date = Column(DateTime, nullable=True)
    actual_completion_date = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    escrow_transaction = relationship("EscrowTransaction", back_populates="milestones")


class PlatformFee(Base):
    """
    Platform fee structure and commission tracking.
    """
    __tablename__ = "platform_fees"

    id = Column(Integer, primary_key=True, index=True)
    
    # Fee structure
    base_commission_rate = Column(Float, default=0.08, nullable=False)  # 8%
    minimum_fee = Column(Float, default=50.0, nullable=False)  # Minimum $50
    maximum_fee = Column(Float, nullable=True)  # Optional cap
    
    # Category-specific rates
    category_rates = Column(JSON, nullable=True)  # Different rates per category
    volume_discounts = Column(JSON, nullable=True)  # Volume-based discounts
    
    # Subscription integration
    subscription_discount = Column(Float, default=0.0)  # Discount for subscribers
    
    # Effective dates
    effective_from = Column(DateTime, default=datetime.utcnow, nullable=False)
    effective_until = Column(DateTime, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def calculate_fee(self, amount: float, category: str = None, user_subscription: str = None) -> dict:
        """Calculate platform fee based on amount and user type."""
        base_rate = self.base_commission_rate
        
        # Apply category-specific rate if available
        if category and self.category_rates and category in self.category_rates:
            base_rate = self.category_rates[category]
        
        # Apply subscription discount
        if user_subscription and self.subscription_discount:
            base_rate = base_rate * (1 - self.subscription_discount)
        
        # Calculate fee
        calculated_fee = amount * base_rate
        
        # Apply minimum and maximum limits
        if calculated_fee < self.minimum_fee:
            calculated_fee = self.minimum_fee
        
        if self.maximum_fee and calculated_fee > self.maximum_fee:
            calculated_fee = self.maximum_fee
        
        return {
            "base_amount": amount,
            "commission_rate": base_rate,
            "calculated_fee": calculated_fee,
            "net_amount": amount - calculated_fee
        }


class PaymentBypassDetection(Base):
    """
    System to detect and prevent payment bypass attempts.
    """
    __tablename__ = "payment_bypass_detection"

    id = Column(Integer, primary_key=True, index=True)
    
    # Detection details
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    manufacturer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Suspicious activity indicators
    direct_contact_detected = Column(Boolean, default=False)
    external_payment_mentioned = Column(Boolean, default=False)
    platform_bypass_keywords = Column(JSON, nullable=True)
    
    # Evidence
    message_content = Column(Text, nullable=True)  # Suspicious messages
    detection_method = Column(String(100), nullable=False)  # How it was detected
    confidence_score = Column(Float, nullable=False)  # 0-1 confidence
    
    # Actions taken
    warning_sent = Column(Boolean, default=False)
    account_flagged = Column(Boolean, default=False)
    transaction_blocked = Column(Boolean, default=False)
    
    # Resolution
    is_resolved = Column(Boolean, default=False)
    resolution_notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    order = relationship("Order")
    client = relationship("User", foreign_keys=[client_id])
    manufacturer = relationship("User", foreign_keys=[manufacturer_id]) 
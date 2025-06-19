from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime

from ..database import Base


class CommunicationBlock(Base):
    """
    Model for blocking communication between clients and manufacturers
    when escrow payment is required.
    """
    __tablename__ = "communication_blocks"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    quote_id = Column(Integer, ForeignKey("quotes.id"), nullable=True)
    escrow_id = Column(Integer, ForeignKey("escrow_transactions.id"), nullable=True)
    client_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    manufacturer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Block details
    block_type = Column(String(50), nullable=False)  # PAYMENT_REQUIRED, BYPASS_DETECTED, etc.
    is_active = Column(Boolean, default=True, nullable=False)
    reason = Column(Text, nullable=False)
    blocked_at = Column(DateTime(timezone=True), server_default=func.now())
    blocked_until = Column(DateTime(timezone=True), nullable=True)
    unblocked_at = Column(DateTime(timezone=True), nullable=True)
    unblock_reason = Column(Text, nullable=True)
    
    # Metadata
    meta_json = Column('metadata', JSON, default=dict)
    
    # Relationships
    order = relationship("Order", back_populates="communication_blocks")
    quote = relationship("Quote", back_populates="communication_blocks")
    escrow = relationship("EscrowTransaction", back_populates="communication_blocks")
    client = relationship("User", foreign_keys=[client_id])
    manufacturer = relationship("User", foreign_keys=[manufacturer_id])


class MessageMonitoring(Base):
    """
    Model for monitoring messages for bypass attempts and policy violations.
    """
    __tablename__ = "message_monitoring"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    quote_id = Column(Integer, ForeignKey("quotes.id"), nullable=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Message details
    message_content = Column(Text, nullable=False)
    message_hash = Column(String(64), nullable=False)  # SHA-256 hash for privacy
    detected_keywords = Column(JSON, default=list)
    
    # Detection results
    bypass_detected = Column(Boolean, default=False)
    confidence_score = Column(Integer, default=0)  # 0-100
    detection_method = Column(String(50), nullable=True)
    action_taken = Column(String(50), nullable=True)
    
    # Timestamps
    message_sent_at = Column(DateTime(timezone=True), nullable=False)
    analyzed_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Metadata
    meta_json = Column('metadata', JSON, default=dict)
    
    # Relationships
    order = relationship("Order")
    quote = relationship("Quote")
    sender = relationship("User", foreign_keys=[sender_id])
    recipient = relationship("User", foreign_keys=[recipient_id])


class PaymentReminder(Base):
    """
    Model for tracking payment reminders sent to clients.
    """
    __tablename__ = "payment_reminders"

    id = Column(Integer, primary_key=True, index=True)
    escrow_id = Column(Integer, ForeignKey("escrow_transactions.id"), nullable=False)
    
    # Reminder details
    reminder_type = Column(String(50), nullable=False)  # gentle_reminder, urgent_reminder, final_warning, quote_expiration
    scheduled_for = Column(DateTime(timezone=True), nullable=False)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    is_sent = Column(Boolean, default=False)
    
    # Content
    subject = Column(String(200), nullable=True)
    message = Column(Text, nullable=True)
    
    # Metadata
    meta_json = Column('metadata', JSON, default=dict)
    
    # Relationships
    escrow = relationship("EscrowTransaction", back_populates="payment_reminders") 
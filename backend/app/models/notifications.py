"""
Notification Models
Database models for the notification system
"""

from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from .base import Base

class NotificationType(str, enum.Enum):
    """Notification types"""
    QUOTE_RECEIVED = "quote_received"
    QUOTE_ACCEPTED = "quote_accepted"
    QUOTE_REJECTED = "quote_rejected"
    ORDER_CREATED = "order_created"
    ORDER_UPDATED = "order_updated"
    ORDER_COMPLETED = "order_completed"
    PAYMENT_RECEIVED = "payment_received"
    PAYMENT_FAILED = "payment_failed"
    MESSAGE_RECEIVED = "message_received"
    SYSTEM_ALERT = "system_alert"
    MANUFACTURER_APPROVED = "manufacturer_approved"

class NotificationPriority(str, enum.Enum):
    """Notification priority levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class Notification(Base):
    """Notification model"""
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(Enum(NotificationType), nullable=False)
    priority = Column(Enum(NotificationPriority), default=NotificationPriority.MEDIUM)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    is_sent = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    read_at = Column(DateTime, nullable=True)
    sent_at = Column(DateTime, nullable=True)
    
    # Optional reference to related entities
    related_entity_type = Column(String(50), nullable=True)  # e.g., "order", "quote", "payment"
    related_entity_id = Column(Integer, nullable=True)
    
    # Metadata
    metadata = Column(Text, nullable=True)  # JSON string for additional data
    
    # Relationships
    user = relationship("User", back_populates="notifications")

    def __repr__(self):
        return f"<Notification(id={self.id}, user_id={self.user_id}, type={self.type}, title='{self.title}')>"

class NotificationPreference(Base):
    """User notification preferences"""
    __tablename__ = "notification_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    
    # Email notifications
    email_quotes = Column(Boolean, default=True)
    email_orders = Column(Boolean, default=True)
    email_payments = Column(Boolean, default=True)
    email_messages = Column(Boolean, default=True)
    email_system = Column(Boolean, default=True)
    
    # In-app notifications
    app_quotes = Column(Boolean, default=True)
    app_orders = Column(Boolean, default=True)
    app_payments = Column(Boolean, default=True)
    app_messages = Column(Boolean, default=True)
    app_system = Column(Boolean, default=True)
    
    # SMS notifications (if implemented)
    sms_urgent = Column(Boolean, default=False)
    sms_payments = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="notification_preferences")

    def __repr__(self):
        return f"<NotificationPreference(user_id={self.user_id})>" 
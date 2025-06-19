from sqlalchemy import Column, Integer, String, DateTime, Enum, Boolean, Text, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum as PyEnum

from app.core.database import Base


class UserRole(PyEnum):
    CLIENT = "client"
    MANUFACTURER = "manufacturer"
    ADMIN = "admin"


class RegistrationStatus(PyEnum):
    PENDING_EMAIL_VERIFICATION = "PENDING_EMAIL_VERIFICATION"
    ACTIVE = "ACTIVE"
    PROFILE_INCOMPLETE = "PROFILE_INCOMPLETE"
    SUSPENDED = "SUSPENDED"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=True)  # Made nullable for Firebase users
    
    # Firebase integration
    firebase_uid = Column(String(128), unique=True, nullable=True, index=True)
    
    # Personal information
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    
    # Company information
    company_name = Column(String(255), nullable=True)
    nip = Column(String(20), nullable=True, index=True)  # Tax ID (NIP in Poland)
    company_address = Column(Text, nullable=True)
    phone = Column(String(20), nullable=True)
    
    # User status and role
    role = Column(Enum(UserRole), nullable=False, index=True)
    registration_status = Column(
        Enum(RegistrationStatus), 
        default=RegistrationStatus.PENDING_EMAIL_VERIFICATION,
        index=True
    )
    is_active = Column(Boolean, default=True, index=True)
    
    # GDPR compliance
    consent_date = Column(DateTime(timezone=True), nullable=True)
    data_processing_consent = Column(Boolean, default=False, nullable=False)
    marketing_consent = Column(Boolean, default=False, nullable=False)
    gdpr_data_export_requested = Column(DateTime(timezone=True), nullable=True)
    gdpr_data_deletion_requested = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now()
    )
    last_login = Column(DateTime(timezone=True), nullable=True, index=True)
    
    # Email verification
    email_verified = Column(Boolean, default=False, index=True)
    email_verification_token = Column(String(255), nullable=True)
    email_verification_sent_at = Column(DateTime(timezone=True), nullable=True)
    
    # Password reset
    password_reset_token = Column(String(255), nullable=True)
    password_reset_expires = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    orders = relationship("Order", back_populates="client", foreign_keys="Order.client_id")
    manufacturer_profile = relationship("Manufacturer", back_populates="user", uselist=False)
    transactions_as_client = relationship(
        "Transaction", 
        back_populates="client", 
        foreign_keys="Transaction.client_id"
    )
    subscriptions = relationship("Subscription", back_populates="user")
    invoices_as_customer = relationship(
        "Invoice", 
        back_populates="customer", 
        foreign_keys="Invoice.customer_id"
    )
    invoices_as_issuer = relationship(
        "Invoice", 
        back_populates="issuer", 
        foreign_keys="Invoice.issuer_id"
    )
    messages = relationship("Message", back_populates="user")
    # Removed incorrect production_quotes relationship - this should be on Manufacturer model
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
    
    @property
    def display_name(self):
        """Display name for Firebase compatibility"""
        return self.full_name
    
    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role})>" 
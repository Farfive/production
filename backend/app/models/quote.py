from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Enum, Text, Numeric, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum as PyEnum
from typing import Dict, List, Any

from app.core.database import Base


class QuoteType(PyEnum):
    ORDER_RESPONSE = "order_response"  # Traditional quote responding to client order
    PRODUCTION_OFFER = "production_offer"  # Manufacturer-initiated production quote


class QuoteStatus(PyEnum):
    DRAFT = "draft"
    SENT = "sent"
    VIEWED = "viewed"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"
    WITHDRAWN = "withdrawn"
    SUPERSEDED = "superseded"
    NEGOTIATING = "negotiating"


class ProductionQuoteType(PyEnum):
    CAPACITY_AVAILABILITY = "capacity_availability"
    STANDARD_PRODUCT = "standard_product"
    PROMOTIONAL = "promotional"
    PROTOTYPE_RD = "prototype_rd"


class NegotiationStatus(PyEnum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    COUNTER_OFFERED = "counter_offered"
    WITHDRAWN = "withdrawn"


class Quote(Base):
    __tablename__ = "quotes"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True, index=True)  # Nullable for production quotes
    manufacturer_id = Column(Integer, ForeignKey("manufacturers.id"), nullable=False, index=True)
    
    # Quote type - NEW FIELD
    quote_type = Column(Enum(QuoteType), default=QuoteType.ORDER_RESPONSE, nullable=False, index=True)
    
    # Quote identification
    quote_number = Column(String(50), unique=True, nullable=True, index=True)
    
    # New fields to match frontend schema
    material = Column(String(200), nullable=True)
    process = Column(String(200), nullable=True)
    finish = Column(String(200), nullable=True)
    tolerance = Column(String(100), nullable=True)
    quantity = Column(Integer, nullable=True)
    shipping_method = Column(String(100), nullable=True)
    warranty = Column(String(200), nullable=True)
    
    # Detailed pricing breakdown
    pricing_breakdown = Column(JSON, nullable=False, default=dict)
    # Example structure:
    # {
    #   "material_costs": {
    #     "aluminum_6061": {"quantity": 5, "unit": "kg", "unit_price": 12.50, "total": 62.50},
    #     "fasteners": {"quantity": 20, "unit": "pcs", "unit_price": 2.00, "total": 40.00}
    #   },
    #   "labor_costs": {
    #     "machining": {"hours": 8, "rate": 75.00, "total": 600.00},
    #     "finishing": {"hours": 2, "rate": 60.00, "total": 120.00},
    #     "quality_control": {"hours": 1, "rate": 80.00, "total": 80.00}
    #   },
    #   "overhead_costs": {
    #     "facility": 50.00,
    #     "utilities": 25.00,
    #     "insurance": 15.00
    #   },
    #   "additional_costs": {
    #     "tooling": 200.00,
    #     "setup": 150.00,
    #     "shipping": 75.00
    #   }
    # }
    
    # Pricing summary
    material_cost_pln = Column(Numeric(12, 2), nullable=False, default=0)
    labor_cost_pln = Column(Numeric(12, 2), nullable=False, default=0)
    overhead_cost_pln = Column(Numeric(12, 2), nullable=False, default=0)
    tooling_cost_pln = Column(Numeric(12, 2), nullable=False, default=0)
    shipping_cost_pln = Column(Numeric(12, 2), nullable=False, default=0)
    other_costs_pln = Column(Numeric(12, 2), nullable=False, default=0)
    
    subtotal_pln = Column(Numeric(12, 2), nullable=False)
    tax_rate_pct = Column(Numeric(5, 2), default=23.00)  # VAT rate in Poland
    tax_amount_pln = Column(Numeric(12, 2), nullable=False, default=0)
    total_price_pln = Column(Numeric(12, 2), nullable=False)
    
    # Unit pricing (for quantity orders)
    price_per_unit_pln = Column(Numeric(12, 2), nullable=True)
    
    # Delivery and timeline
    lead_time_days = Column(Integer, nullable=False)
    production_time_days = Column(Integer, nullable=True)
    shipping_time_days = Column(Integer, nullable=True)
    delivery_method = Column(String(100), nullable=True)  # "Courier", "Pickup", "Freight"
    
    # Delivery estimates with breakdown
    delivery_timeline = Column(JSON, nullable=True, default=dict)
    # {
    #   "design_review": {"days": 2, "description": "Technical review and approval"},
    #   "material_procurement": {"days": 5, "description": "Source and receive materials"},
    #   "production": {"days": 10, "description": "Manufacturing and assembly"},
    #   "quality_control": {"days": 2, "description": "Inspection and testing"},
    #   "packaging_shipping": {"days": 1, "description": "Package and ship"}
    # }
    
    # Terms and conditions
    payment_terms = Column(Text, nullable=True)
    warranty_period_days = Column(Integer, nullable=True)
    warranty_description = Column(Text, nullable=True)
    
    # Capabilities and certifications for this quote
    manufacturing_process = Column(String(100), nullable=True)
    quality_certifications_applicable = Column(JSON, nullable=True, default=list)
    special_capabilities_used = Column(JSON, nullable=True, default=list)
    
    # Additional information
    technical_notes = Column(Text, nullable=True)
    client_message = Column(Text, nullable=True)
    internal_notes = Column(Text, nullable=True)  # Not visible to client
    
    # Alternatives and options
    alternative_materials = Column(JSON, nullable=True, default=list)
    alternative_processes = Column(JSON, nullable=True, default=list)
    volume_discounts = Column(JSON, nullable=True, default=dict)
    # {"100": {"discount_pct": 5, "price_per_unit": 95.00}, "500": {"discount_pct": 10, "price_per_unit": 90.00}}
    
    # Validity and revisions
    valid_until = Column(DateTime(timezone=True), nullable=True, index=True)
    
    # Status and workflow
    status = Column(Enum(QuoteStatus), default=QuoteStatus.DRAFT, index=True)
    
    # Client interaction
    viewed_at = Column(DateTime(timezone=True), nullable=True)
    client_response = Column(Text, nullable=True)
    
    # Producer updates
    revision_count = Column(Integer, default=0)
    original_quote_id = Column(Integer, ForeignKey("quotes.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now()
    )
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    rejected_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    order = relationship("Order", back_populates="quotes", foreign_keys=[order_id])
    manufacturer = relationship("Manufacturer", back_populates="quotes")
    original_quote = relationship("Quote", remote_side=[id])
    revisions = relationship("Quote", back_populates="original_quote")
    transactions = relationship("Transaction", back_populates="quote")
    invoices = relationship("Invoice", back_populates="quote", foreign_keys="Invoice.quote_id")
    # escrow_transactions = relationship("EscrowTransaction", back_populates="quote")  # Temporarily disabled
    # communication_blocks = relationship("CommunicationBlock", back_populates="quote")  # Temporarily disabled
    attachments = relationship("QuoteAttachment", back_populates="quote", cascade="all, delete-orphan")
    negotiations = relationship("QuoteNegotiation", back_populates="quote", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Quote(id={self.id}, order_id={self.order_id}, total_price_pln={self.total_price_pln})>"
    
    @property
    def is_valid(self):
        """Check if quote is still valid"""
        if not self.valid_until:
            return True
        from datetime import datetime
        return datetime.now() < self.valid_until
    
    @property
    def is_expired(self):
        """Check if quote is expired"""
        return not self.is_valid
    
    @property
    def platform_fee(self):
        """Calculate platform fee (15% of quote price)"""
        from app.core.config import settings
        return self.total_price_pln * (settings.PLATFORM_FEE_PERCENTAGE / 100)
    
    @property
    def producer_payout(self):
        """Calculate producer payout after platform fee"""
        return self.total_price_pln - self.platform_fee
    
    def can_be_modified(self):
        """Check if quote can be modified"""
        return self.status in [QuoteStatus.SENT, QuoteStatus.VIEWED, QuoteStatus.NEGOTIATING]
    
    def can_be_withdrawn(self):
        """Check if quote can be withdrawn by producer"""
        return self.status in [QuoteStatus.SENT, QuoteStatus.VIEWED, QuoteStatus.NEGOTIATING]
    
    def mark_as_viewed(self):
        """Mark quote as viewed by client"""
        if self.status == QuoteStatus.SENT:
            self.status = QuoteStatus.VIEWED
            from datetime import datetime
            self.viewed_at = datetime.now()


class QuoteAttachment(Base):
    __tablename__ = "quote_attachments"
    
    id = Column(Integer, primary_key=True, index=True)
    quote_id = Column(Integer, ForeignKey("quotes.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    file_type = Column(String(100), nullable=False)
    mime_type = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_public = Column(Boolean, default=True)  # Whether client can see this attachment
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    quote = relationship("Quote", back_populates="attachments")
    uploader = relationship("User")
    
    def __repr__(self):
        return f"<QuoteAttachment(id={self.id}, quote_id={self.quote_id}, name={self.name})>"


class QuoteNegotiation(Base):
    __tablename__ = "quote_negotiations"
    
    id = Column(Integer, primary_key=True, index=True)
    quote_id = Column(Integer, ForeignKey("quotes.id"), nullable=False, index=True)
    message = Column(Text, nullable=False)
    requested_price = Column(Numeric(12, 2), nullable=True)
    requested_delivery_days = Column(Integer, nullable=True)
    changes_requested = Column(JSON, nullable=True)  # Structured change requests
    
    # Negotiation metadata
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(Enum(NegotiationStatus), default=NegotiationStatus.PENDING, index=True)
    response_message = Column(Text, nullable=True)
    responded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    responded_at = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    quote = relationship("Quote", back_populates="negotiations")
    creator = relationship("User", foreign_keys=[created_by])
    responder = relationship("User", foreign_keys=[responded_by])
    
    def __repr__(self):
        return f"<QuoteNegotiation(id={self.id}, quote_id={self.quote_id}, status={self.status})>"


class QuoteNotification(Base):
    __tablename__ = "quote_notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    quote_id = Column(Integer, ForeignKey("quotes.id"), nullable=False, index=True)
    
    # Notification details
    type = Column(String(50), nullable=False, index=True)  # 'new_quote', 'quote_accepted', 'negotiation_request', etc.
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    
    # Notification status
    read = Column(Boolean, default=False, index=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    sent_via_email = Column(Boolean, default=False)
    sent_via_push = Column(Boolean, default=False)
    
    # Additional data
    notification_metadata = Column(JSON, nullable=True)
    action_url = Column(String(500), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User")
    quote = relationship("Quote")
    
    def __repr__(self):
        return f"<QuoteNotification(id={self.id}, user_id={self.user_id}, type={self.type})>"


class ProductionQuote(Base):
    """Manufacturer-initiated production quotes for advertising capacity and capabilities"""
    __tablename__ = "production_quotes"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    manufacturer_id = Column(Integer, ForeignKey("manufacturers.id"), nullable=False, index=True)
    
    # Production quote type and basic info
    production_quote_type = Column(Enum(ProductionQuoteType), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    
    # Availability & Timing
    available_from = Column(DateTime(timezone=True), nullable=True, index=True)
    available_until = Column(DateTime(timezone=True), nullable=True, index=True)
    lead_time_days = Column(Integer, nullable=True)
    
    # Pricing Structure
    pricing_model = Column(String(50), nullable=False)  # 'fixed', 'hourly', 'per_unit', 'tiered'
    base_price = Column(Numeric(12, 2), nullable=True)
    pricing_details = Column(JSON, nullable=False, default=dict)  # Flexible pricing structure
    currency = Column(String(3), default="PLN")
    
    # Capabilities & Specifications
    manufacturing_processes = Column(JSON, nullable=True, default=list)  # ["CNC Machining", "3D Printing"]
    materials = Column(JSON, nullable=True, default=list)  # ["Aluminum", "Steel", "Plastic"]
    certifications = Column(JSON, nullable=True, default=list)  # ["ISO 9001", "AS9100"]
    specialties = Column(JSON, nullable=True, default=list)  # ["Aerospace", "Medical"]
    
    # Constraints
    minimum_quantity = Column(Integer, nullable=True)
    maximum_quantity = Column(Integer, nullable=True)
    minimum_order_value = Column(Numeric(12, 2), nullable=True)
    maximum_order_value = Column(Numeric(12, 2), nullable=True)
    
    # Geographic preferences
    preferred_countries = Column(JSON, nullable=True, default=list)  # ["PL", "DE", "EU"]
    shipping_options = Column(JSON, nullable=True, default=list)
    
    # Visibility & Status
    is_public = Column(Boolean, default=True, index=True)
    is_active = Column(Boolean, default=True, index=True)
    priority_level = Column(Integer, default=1, index=True)  # 1=low, 5=high
    
    # Terms and conditions
    payment_terms = Column(Text, nullable=True)
    warranty_terms = Column(Text, nullable=True)
    special_conditions = Column(Text, nullable=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True, index=True)
    
    # Analytics
    view_count = Column(Integer, default=0)
    inquiry_count = Column(Integer, default=0)
    conversion_count = Column(Integer, default=0)
    last_viewed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Additional features
    tags = Column(JSON, nullable=True, default=list)  # ["rush-order", "prototype", "high-volume"]
    attachments = Column(JSON, nullable=True, default=list)  # File attachments
    sample_images = Column(JSON, nullable=True, default=list)  # Sample work images
    
    # Relationships
    manufacturer = relationship("Manufacturer", back_populates="production_quotes")
    inquiries = relationship("ProductionQuoteInquiry", back_populates="production_quote", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<ProductionQuote(id={self.id}, title={self.title}, type={self.production_quote_type})>"
    
    @property
    def is_valid(self):
        """Check if production quote is still valid"""
        if not self.expires_at:
            return self.is_active
        from datetime import datetime, timezone
        return self.is_active and datetime.now(timezone.utc) < self.expires_at
    
    @property
    def is_available_now(self):
        """Check if production quote is available right now"""
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        
        if not self.is_valid:
            return False
            
        if self.available_from and now < self.available_from:
            return False
            
        if self.available_until and now > self.available_until:
            return False
            
        return True
    
    def increment_view_count(self):
        """Increment view count and update last viewed timestamp"""
        self.view_count += 1
        from datetime import datetime, timezone
        self.last_viewed_at = datetime.now(timezone.utc)
    
    def increment_inquiry_count(self):
        """Increment inquiry count"""
        self.inquiry_count += 1
    
    def increment_conversion_count(self):
        """Increment conversion count when inquiry leads to order"""
        self.conversion_count += 1


class ProductionQuoteInquiry(Base):
    """Client inquiries about production quotes"""
    __tablename__ = "production_quote_inquiries"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    production_quote_id = Column(Integer, ForeignKey("production_quotes.id"), nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Inquiry details
    message = Column(Text, nullable=False)
    estimated_quantity = Column(Integer, nullable=True)
    estimated_budget = Column(Numeric(12, 2), nullable=True)
    timeline = Column(String(100), nullable=True)  # "Q2 2024", "ASAP", "March 2024"
    
    # Requirements
    specific_requirements = Column(JSON, nullable=True, default=dict)
    preferred_delivery_date = Column(DateTime(timezone=True), nullable=True)
    
    # Status and response
    status = Column(String(50), default="pending", index=True)  # pending, responded, converted, closed
    manufacturer_response = Column(Text, nullable=True)
    responded_at = Column(DateTime(timezone=True), nullable=True)
    
    # Conversion tracking
    converted_to_order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    converted_to_quote_id = Column(Integer, ForeignKey("quotes.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    production_quote = relationship("ProductionQuote", back_populates="inquiries")
    client = relationship("User")
    converted_order = relationship("Order")
    converted_quote = relationship("Quote")
    
    def __repr__(self):
        return f"<ProductionQuoteInquiry(id={self.id}, production_quote_id={self.production_quote_id}, status={self.status})>" 
from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Enum, Text, Numeric, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum as PyEnum
from typing import Dict, List, Any

from app.core.database import Base


class QuoteStatus(PyEnum):
    DRAFT = "draft"
    SENT = "sent"
    VIEWED = "viewed"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"
    WITHDRAWN = "withdrawn"
    SUPERSEDED = "superseded"


class Quote(Base):
    __tablename__ = "quotes"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    manufacturer_id = Column(Integer, ForeignKey("manufacturers.id"), nullable=False, index=True)
    
    # Quote identification
    quote_number = Column(String(50), unique=True, nullable=True, index=True)
    
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
    
    def __repr__(self):
        return f"<Quote(id={self.id}, order_id={self.order_id}, price_pln={self.price_pln})>"
    
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
        return self.price_pln * (settings.PLATFORM_FEE_PERCENTAGE / 100)
    
    @property
    def producer_payout(self):
        """Calculate producer payout after platform fee"""
        return self.price_pln - self.platform_fee
    
    def can_be_modified(self):
        """Check if quote can be modified"""
        return self.status in [QuoteStatus.SENT, QuoteStatus.VIEWED]
    
    def can_be_withdrawn(self):
        """Check if quote can be withdrawn by producer"""
        return self.status in [QuoteStatus.SENT, QuoteStatus.VIEWED]
    
    def mark_as_viewed(self):
        """Mark quote as viewed by client"""
        if self.status == QuoteStatus.SENT:
            self.status = QuoteStatus.VIEWED
            from datetime import datetime
            self.viewed_at = datetime.now() 
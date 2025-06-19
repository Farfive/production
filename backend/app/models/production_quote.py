"""
Production Quote Models
Manufacturing platform production quote database models.
"""

import enum
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, JSON, func
from sqlalchemy.types import Numeric
from sqlalchemy.orm import relationship
from decimal import Decimal as PyDecimal

from app.core.database import Base


class ProductionQuoteType(enum.Enum):
    """Production quote type enumeration."""
    STANDARD = "standard"
    CUSTOM = "custom"
    PROTOTYPE = "prototype"
    BULK = "bulk"
    RUSH = "rush"


class PricingModel(enum.Enum):
    """Pricing model enumeration."""
    FIXED = "fixed"
    HOURLY = "hourly"
    PER_UNIT = "per_unit"
    TIERED = "tiered"
    NEGOTIABLE = "negotiable"


class ProductionQuoteStatus(enum.Enum):
    """Production quote status enumeration."""
    DRAFT = "draft"
    ACTIVE = "active"
    PENDING = "pending"
    RESPONDED = "responded"
    CONVERTED = "converted"
    CLOSED = "closed"
    EXPIRED = "expired"


class LegacyProductionQuote(Base):
    """Legacy Production Quote model to avoid conflict with new ProductionQuote."""
    __tablename__ = "legacy_production_quotes"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    manufacturer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Basic Information
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text)
    category = Column(String(100), nullable=False, index=True)
    subcategory = Column(String(100))
    
    # Quote Type and Pricing
    quote_type = Column(String(20), nullable=False, default=ProductionQuoteType.STANDARD.value)
    pricing_model = Column(String(20), nullable=False, default=PricingModel.FIXED.value)
    base_price = Column(Numeric(precision=10, scale=2))
    currency = Column(String(3), default="PLN")
    
    # Pricing Details
    pricing_details = Column(JSON)  # Flexible pricing structure
    minimum_order_quantity = Column(Integer)
    maximum_order_quantity = Column(Integer)
    
    # Capabilities
    materials = Column(JSON)  # List of supported materials
    processes = Column(JSON)  # List of manufacturing processes
    specifications = Column(JSON)  # Technical specifications
    quality_standards = Column(JSON)  # Quality certifications
    
    # Timeline
    lead_time_min = Column(Integer)  # Minimum lead time in days
    lead_time_max = Column(Integer)  # Maximum lead time in days
    availability_start = Column(DateTime)
    availability_end = Column(DateTime)
    
    # Location and Shipping
    location = Column(String(255))
    shipping_options = Column(JSON)
    shipping_costs = Column(JSON)
    
    # Status and Metadata
    status = Column(String(20), default=ProductionQuoteStatus.ACTIVE.value)
    priority_level = Column(Integer, default=1)  # 1-5 priority
    view_count = Column(Integer, default=0)
    inquiry_count = Column(Integer, default=0)
    
    # SEO and Discovery
    tags = Column(JSON)  # Search tags
    keywords = Column(String(500))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    expires_at = Column(DateTime(timezone=True))
    
    # Relationships
    manufacturer = relationship("User")
    inquiries = relationship("LegacyProductionQuoteInquiry", back_populates="production_quote")
    
    def __repr__(self):
        return f"<ProductionQuote(id={self.id}, title='{self.title}', manufacturer_id={self.manufacturer_id})>"


class LegacyProductionQuoteInquiry(Base):
    """Legacy Production Quote Inquiry model."""
    __tablename__ = "legacy_production_quote_inquiries"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    production_quote_id = Column(Integer, ForeignKey("legacy_production_quotes.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Inquiry Details
    message = Column(Text, nullable=False)
    quantity = Column(Integer)
    specifications = Column(JSON)
    timeline_requirements = Column(JSON)
    budget_range = Column(JSON)
    
    # Response
    manufacturer_response = Column(Text)
    quoted_price = Column(Numeric(precision=10, scale=2))
    quoted_timeline = Column(Integer)  # Days
    
    # Status
    status = Column(String(20), default="pending")
    priority = Column(Integer, default=1)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    responded_at = Column(DateTime(timezone=True))
    
    # Relationships
    production_quote = relationship("LegacyProductionQuote", back_populates="inquiries")
    client = relationship("User", foreign_keys=[client_id])
    
    def __repr__(self):
        return f"<ProductionQuoteInquiry(id={self.id}, quote_id={self.production_quote_id}, client_id={self.client_id})>"


class LegacyProductionQuoteView(Base):
    """Legacy Production Quote View tracking."""
    __tablename__ = "legacy_production_quote_views"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True)
    production_quote_id = Column(Integer, ForeignKey("legacy_production_quotes.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # View Details
    ip_address = Column(String(45))
    user_agent = Column(String(500))
    referrer = Column(String(500))
    session_id = Column(String(100))
    
    # Timestamp
    viewed_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    production_quote = relationship("LegacyProductionQuote")
    user = relationship("User")
    
    def __repr__(self):
        return f"<ProductionQuoteView(id={self.id}, quote_id={self.production_quote_id}, user_id={self.user_id})>" 
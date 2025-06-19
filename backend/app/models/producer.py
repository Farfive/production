from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, ForeignKey, JSON, Text, Numeric, Index, func
from sqlalchemy.orm import relationship, foreign
from typing import Dict, List, Any

from app.core.database import Base


class Manufacturer(Base):
    __tablename__ = "manufacturers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True)
    
    # Company information (inherited from User but can be overridden)
    business_name = Column(String(255), nullable=True)
    business_description = Column(Text, nullable=True)
    website = Column(String(255), nullable=True)
    
    # Geographic information for proximity matching
    country = Column(String(2), default='PL', nullable=False, index=True)  # ISO country code
    state_province = Column(String(100), nullable=True, index=True)
    city = Column(String(100), nullable=False, index=True)
    postal_code = Column(String(20), nullable=True, index=True)
    latitude = Column(Numeric(10, 8), nullable=True)  # For precise distance calculations
    longitude = Column(Numeric(11, 8), nullable=True)
    
    # Capabilities matrix (flexible JSON structure)
    capabilities = Column(JSON, nullable=False, default=dict)
    # Example structure:
    # {
    #   "manufacturing_processes": ["CNC Machining", "3D Printing", "Injection Molding"],
    #   "materials": ["Steel", "Aluminum", "Plastic", "Titanium"],
    #   "certifications": ["ISO 9001", "ISO 14001", "AS9100"],
    #   "quality_standards": ["Six Sigma", "Lean Manufacturing"],
    #   "equipment": ["5-axis CNC", "SLA Printer", "Coordinate Measuring Machine"],
    #   "industries_served": ["Aerospace", "Automotive", "Medical", "Defense"],
    #   "special_capabilities": ["Precision Machining", "Large Part Manufacturing"]
    # }
    
    # Production capacity and constraints
    production_capacity_monthly = Column(Integer, nullable=True)  # Units per month
    capacity_utilization_pct = Column(Float, default=0.0)  # Current utilization percentage
    min_order_quantity = Column(Integer, default=1)
    max_order_quantity = Column(Integer, nullable=True)
    min_order_value_pln = Column(Numeric(12, 2), nullable=True)
    max_order_value_pln = Column(Numeric(12, 2), nullable=True)
    
    # Lead times and scheduling
    standard_lead_time_days = Column(Integer, nullable=True)
    rush_order_available = Column(Boolean, default=False)
    rush_order_lead_time_days = Column(Integer, nullable=True)
    rush_order_surcharge_pct = Column(Float, default=0.0)
    
    # Quality and certifications
    quality_certifications = Column(JSON, nullable=True, default=list)
    # ["ISO 9001:2015", "AS9100D", "ISO 13485:2016", "IATF 16949:2016"]
    
    # Portfolio and experience
    years_in_business = Column(Integer, nullable=True)
    number_of_employees = Column(Integer, nullable=True)
    annual_revenue_range = Column(String(50), nullable=True)  # e.g., "1M-5M PLN"
    portfolio_images = Column(JSON, nullable=True, default=list)  # URLs to portfolio images
    case_studies = Column(JSON, nullable=True, default=list)  # Case study data
    
    # Business metrics and ratings
    overall_rating = Column(Numeric(3, 2), default=0.0, index=True)  # 0.00 to 5.00
    quality_rating = Column(Numeric(3, 2), default=0.0)
    delivery_rating = Column(Numeric(3, 2), default=0.0)
    communication_rating = Column(Numeric(3, 2), default=0.0)
    price_competitiveness_rating = Column(Numeric(3, 2), default=0.0)
    
    total_orders_completed = Column(Integer, default=0, index=True)
    total_orders_in_progress = Column(Integer, default=0)
    total_revenue_pln = Column(Numeric(15, 2), default=0.0)
    on_time_delivery_rate = Column(Float, default=0.0)  # Percentage
    repeat_customer_rate = Column(Float, default=0.0)  # Percentage
    
    # Payment and financial
    stripe_account_id = Column(String(255), nullable=True, unique=True)
    stripe_onboarding_completed = Column(Boolean, default=False, index=True)
    payment_terms = Column(String(100), default="Net 30")  # e.g., "Net 30", "50% upfront"
    
    # Status and verification
    is_active = Column(Boolean, default=True, index=True)
    is_verified = Column(Boolean, default=False, index=True)
    verification_date = Column(DateTime(timezone=True), nullable=True)
    profile_completion_pct = Column(Float, default=0.0)
    last_activity_date = Column(DateTime(timezone=True), nullable=True, index=True)
    
    # Preferences and settings
    preferred_order_size = Column(String(50), nullable=True)  # "Small", "Medium", "Large", "Any"
    preferred_industries = Column(JSON, nullable=True, default=list)
    accepts_international_orders = Column(Boolean, default=False)
    preferred_communication_method = Column(String(50), default="email")
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now()
    )
    
    # Relationships
    user = relationship("User", back_populates="manufacturer_profile")
    quotes = relationship("Quote", back_populates="manufacturer")
    quote_templates = relationship("QuoteTemplate", back_populates="manufacturer")
    transactions_as_manufacturer = relationship(
        "Transaction", 
        back_populates="manufacturer", 
        foreign_keys="Transaction.manufacturer_id"
    )
    stripe_connect_account = relationship("StripeConnectAccount", back_populates="manufacturer", uselist=False)
    subscriptions = relationship("Subscription", back_populates="manufacturer")
    # Invoices where this manufacturer (via its user account) is the issuer
    invoices_as_issuer = relationship(
        "Invoice",
        primaryjoin="Manufacturer.user_id==foreign(Invoice.issuer_id)",
        viewonly=True,
        back_populates="issuer_manufacturer"
    )
    production_quotes = relationship(
        "ProductionQuote", 
        back_populates="manufacturer"
    )
    
    def __repr__(self):
        return f"<Producer(id={self.id}, company_name={self.company_name}, location={self.location})>"
    
    @property
    def average_rating(self):
        """Calculate average rating from completed orders"""
        if self.total_orders_completed == 0:
            return 0.0
        return round(self.rating, 2)
    
    def can_handle_technology(self, technology: str) -> bool:
        """Check if producer can handle specific technology"""
        return technology.lower() in [tech.lower() for tech in self.technologies]
    
    def can_handle_material(self, material: str) -> bool:
        """Check if producer can handle specific material"""
        if not self.materials:
            return True  # Accept all materials if not specified
        return material.lower() in [mat.lower() for mat in self.materials]

# Alias for backward compatibility
Producer = Manufacturer 
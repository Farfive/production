from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Enum, JSON, Text, Numeric, Boolean, Index
from sqlalchemy.orm import relationship, column_property, synonym
from sqlalchemy.sql import func
from enum import Enum as PyEnum
from datetime import datetime
from typing import Dict, List, Any

from app.core.database import Base


class OrderStatus(PyEnum):
    DRAFT = "draft"
    ACTIVE = "active"
    QUOTED = "quoted"
    ACCEPTED = "accepted"
    IN_PRODUCTION = "in_production"
    DELIVERED = "delivered"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    DISPUTED = "disputed"


class Priority(PyEnum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class BudgetType(PyEnum):
    FIXED = "fixed"
    RANGE = "range"
    NEGOTIABLE = "negotiable"


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Order identification
    order_number = Column(String(50), unique=True, nullable=True, index=True)  # Auto-generated
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=False)
    
    # Technical requirements (enhanced JSON structure)
    technical_requirements = Column(JSON, nullable=False, default=dict)
    # Example structure:
    # {
    #   "manufacturing_process": "CNC Machining",
    #   "material": "Aluminum 6061",
    #   "material_grade": "T6",
    #   "finish": "Anodized",
    #   "tolerances": "±0.1mm",
    #   "surface_roughness": "Ra 3.2",
    #   "hardness": "HRC 30-35",
    #   "dimensions": {"length": 100, "width": 50, "height": 25, "unit": "mm"},
    #   "weight": {"value": 0.5, "unit": "kg"},
    #   "special_requirements": ["Food grade", "Corrosion resistant"],
    #   "industry_standards": ["ISO 9001", "FDA approved"],
    #   "testing_requirements": ["Dimensional inspection", "Material certification"]
    # }
    
    # Quantity and production details
    quantity = Column(Integer, nullable=False, index=True)
    quantity_unit = Column(String(20), default="pieces")  # pieces, kg, m, etc.
    prototype_required = Column(Boolean, default=False)
    prototype_quantity = Column(Integer, nullable=True)
    
    # Budget information
    budget_type = Column(Enum(BudgetType), default=BudgetType.RANGE)
    budget_min_pln = Column(Numeric(12, 2), nullable=True)
    budget_max_pln = Column(Numeric(12, 2), nullable=True)
    budget_fixed_pln = Column(Numeric(12, 2), nullable=True)
    budget_per_unit = Column(Boolean, default=False)  # True if budget is per unit

    # ----------------------------------------------------------------------------------
    # Legacy backward-compatibility aliases – remove once all code/tests are updated
    # ----------------------------------------------------------------------------------
    # Some older endpoints / tests still reference `budget_min` / `budget_max`.
    # Use synonym instead of column_property to avoid SQLAlchemy warnings
    budget_min = synonym('budget_min_pln')
    budget_max = synonym('budget_max_pln')
    
    # Timeline and delivery
    delivery_deadline = Column(DateTime(timezone=True), nullable=False, index=True)
    delivery_flexibility_days = Column(Integer, default=0)  # How many days flexibility
    preferred_delivery_date = Column(DateTime(timezone=True), nullable=True)
    rush_order = Column(Boolean, default=False, index=True)
    
    # Geographic preferences
    preferred_country = Column(String(2), nullable=True, index=True)
    preferred_state_province = Column(String(100), nullable=True)
    preferred_city = Column(String(100), nullable=True)
    max_distance_km = Column(Integer, nullable=True)  # Maximum distance from client
    international_shipping_ok = Column(Boolean, default=True)
    
    # Priority and categorization
    priority = Column(Enum(Priority), default=Priority.NORMAL, index=True)
    industry_category = Column(String(100), nullable=True, index=True)
    project_category = Column(String(100), nullable=True)  # "Prototype", "Production", "Repair"
    
    # File attachments and documentation
    attachments = Column(JSON, nullable=True, default=list)  # Array of file metadata
    # [{"filename": "drawing.pdf", "url": "...", "type": "technical_drawing", "size": 1024}]
    
    # Status and workflow
    status = Column(Enum(OrderStatus), default=OrderStatus.DRAFT, index=True)
    
    # Matching and selection
    matched_at = Column(DateTime(timezone=True), nullable=True)
    selected_quote_id = Column(Integer, ForeignKey("quotes.id"), nullable=True)
    
    # Production tracking
    production_started_at = Column(DateTime(timezone=True), nullable=True)
    estimated_completion = Column(DateTime(timezone=True), nullable=True)
    actual_completion = Column(DateTime(timezone=True), nullable=True)
    
    # Client feedback
    client_rating = Column(Integer, nullable=True)  # 1-5 stars
    client_feedback = Column(Text, nullable=True)
    
    # Admin notes
    admin_notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now()
    )
    
    # Relationships
    client = relationship("User", back_populates="orders", foreign_keys=[client_id])
    quotes = relationship("Quote", back_populates="order", foreign_keys="Quote.order_id")
    selected_quote = relationship("Quote", foreign_keys=[selected_quote_id], post_update=True)
    transactions = relationship("Transaction", back_populates="order")
    invoices = relationship("Invoice", back_populates="order")
    escrow_accounts = relationship("EscrowAccount", back_populates="order")
    # escrow_transactions = relationship("EscrowTransaction", back_populates="order")  # Temporarily disabled
    # communication_blocks = relationship("CommunicationBlock", back_populates="order")  # Temporarily disabled
    purchase_orders = relationship("PurchaseOrder", back_populates="order")
    inventory_transactions = relationship("InventoryTransaction", back_populates="order")
    
    def __repr__(self):
        return f"<Order(id={self.id}, title={self.title}, status={self.status})>"
    
    @property
    def is_active(self):
        """Check if order is in an active state"""
        active_statuses = [
            OrderStatus.PENDING_MATCHING,
            OrderStatus.OFFERS_SENT,
            OrderStatus.OFFER_ACCEPTED,
            OrderStatus.PAYMENT_PENDING,
            OrderStatus.PAYMENT_COMPLETED,
            OrderStatus.IN_PRODUCTION
        ]
        return self.status in active_statuses
    
    @property
    def is_completed(self):
        """Check if order is completed"""
        return self.status == OrderStatus.COMPLETED
    
    @property
    def is_overdue(self):
        """Check if order is overdue"""
        if not self.delivery_deadline:
            return False
        return datetime.now() > self.delivery_deadline and not self.is_completed
    
    @property
    def days_until_deadline(self):
        """Calculate days until deadline"""
        if not self.delivery_deadline:
            return None
        delta = self.delivery_deadline - datetime.now()
        return delta.days
    
    def can_accept_quotes(self):
        """Check if order can accept new quotes"""
        return self.status in [OrderStatus.PENDING_MATCHING, OrderStatus.OFFERS_SENT] 
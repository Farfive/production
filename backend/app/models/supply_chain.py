"""
Supply Chain Integration Models

Database models for comprehensive supply chain management including
material tracking, vendor management, inventory control, and logistics.
"""

from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, ForeignKey, JSON, Text, Numeric, Enum as SQLEnum, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum as PyEnum
from typing import Dict, List, Any, Optional
from datetime import datetime

from app.core.database import Base


class MaterialCategory(PyEnum):
    RAW_MATERIAL = "raw_material"
    COMPONENT = "component"
    ASSEMBLY = "assembly"
    CONSUMABLE = "consumable"
    TOOL = "tool"
    PACKAGING = "packaging"
    CHEMICAL = "chemical"
    ELECTRONIC = "electronic"


class MaterialStatus(PyEnum):
    ACTIVE = "active"
    DISCONTINUED = "discontinued"
    OBSOLETE = "obsolete"
    RESTRICTED = "restricted"
    PENDING_APPROVAL = "pending_approval"


class VendorStatus(PyEnum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING_APPROVAL = "pending_approval"
    SUSPENDED = "suspended"
    BLACKLISTED = "blacklisted"


class VendorTier(PyEnum):
    TIER_1 = "tier_1"  # Strategic partners
    TIER_2 = "tier_2"  # Preferred suppliers
    TIER_3 = "tier_3"  # Approved suppliers
    TIER_4 = "tier_4"  # Occasional suppliers


class PurchaseOrderStatus(PyEnum):
    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    SENT = "sent"
    ACKNOWLEDGED = "acknowledged"
    IN_PRODUCTION = "in_production"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    DISPUTED = "disputed"


class InventoryTransactionType(PyEnum):
    RECEIPT = "receipt"
    ISSUE = "issue"
    TRANSFER = "transfer"
    ADJUSTMENT = "adjustment"
    RETURN = "return"
    SCRAP = "scrap"
    CYCLE_COUNT = "cycle_count"


class QualityStatus(PyEnum):
    PENDING = "pending"
    PASSED = "passed"
    FAILED = "failed"
    CONDITIONAL = "conditional"
    QUARANTINED = "quarantined"


class Material(Base):
    """Material master data with comprehensive tracking"""
    __tablename__ = "materials"

    id = Column(Integer, primary_key=True, index=True)
    
    # Basic Information
    material_code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    category = Column(SQLEnum(MaterialCategory), nullable=False, index=True)
    status = Column(SQLEnum(MaterialStatus), default=MaterialStatus.ACTIVE, index=True)
    
    # Classification
    material_group = Column(String(100), nullable=True, index=True)
    commodity_code = Column(String(20), nullable=True)  # HS/HTS code for customs
    hazmat_class = Column(String(10), nullable=True)  # Hazardous material classification
    
    # Physical Properties
    unit_of_measure = Column(String(20), nullable=False)  # kg, pcs, m, etc.
    weight_kg = Column(Numeric(10, 4), nullable=True)
    dimensions = Column(JSON, nullable=True)  # {"length": 10, "width": 5, "height": 2, "unit": "cm"}
    volume_m3 = Column(Numeric(10, 6), nullable=True)
    
    # Specifications
    specifications = Column(JSON, nullable=True)
    # {
    #   "grade": "304 Stainless Steel",
    #   "hardness": "HRC 45-50",
    #   "surface_finish": "Ra 0.8",
    #   "tolerance": "±0.1mm",
    #   "certifications": ["ISO 9001", "ASTM A240"]
    # }
    
    # Quality Requirements
    quality_standards = Column(JSON, nullable=True)
    inspection_required = Column(Boolean, default=False)
    shelf_life_days = Column(Integer, nullable=True)
    storage_conditions = Column(JSON, nullable=True)
    
    # Cost Information
    standard_cost_pln = Column(Numeric(12, 4), nullable=True)
    last_cost_pln = Column(Numeric(12, 4), nullable=True)
    average_cost_pln = Column(Numeric(12, 4), nullable=True)
    cost_updated_at = Column(DateTime(timezone=True), nullable=True)
    
    # Inventory Control
    abc_classification = Column(String(1), nullable=True)  # A, B, C
    safety_stock_qty = Column(Numeric(12, 2), default=0)
    reorder_point_qty = Column(Numeric(12, 2), default=0)
    economic_order_qty = Column(Numeric(12, 2), nullable=True)
    max_stock_qty = Column(Numeric(12, 2), nullable=True)
    
    # Lead Times
    procurement_lead_time_days = Column(Integer, default=30)
    manufacturing_lead_time_days = Column(Integer, nullable=True)
    
    # Sustainability
    sustainability_score = Column(Float, nullable=True)  # 0-100
    carbon_footprint_kg = Column(Numeric(10, 4), nullable=True)
    recyclable = Column(Boolean, default=False)
    
    # Compliance
    rohs_compliant = Column(Boolean, default=True)
    reach_compliant = Column(Boolean, default=True)
    conflict_minerals_free = Column(Boolean, default=True)
    
    # Audit Fields
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    created_by = relationship("User", foreign_keys=[created_by_id])
    vendors = relationship("MaterialVendor", back_populates="material")
    inventory_items = relationship("InventoryItem", back_populates="material")
    purchase_order_items = relationship("PurchaseOrderItem", back_populates="material")
    bom_items = relationship("BillOfMaterialItem", back_populates="material")
    quality_records = relationship("QualityRecord", back_populates="material")
    
    # Indexes
    __table_args__ = (
        Index('idx_material_category_status', 'category', 'status'),
        Index('idx_material_group_category', 'material_group', 'category'),
        {'extend_existing': True}
    )


class Vendor(Base):
    """Vendor/Supplier master data"""
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    
    # Basic Information
    vendor_code = Column(String(50), unique=True, nullable=False, index=True)
    company_name = Column(String(255), nullable=False, index=True)
    legal_name = Column(String(255), nullable=True)
    duns_number = Column(String(20), nullable=True, unique=True)
    tax_id = Column(String(50), nullable=True)
    
    # Contact Information
    primary_contact = Column(JSON, nullable=True)
    # {
    #   "name": "John Smith",
    #   "title": "Sales Manager",
    #   "email": "john@vendor.com",
    #   "phone": "+1-555-0123"
    # }
    
    # Address Information
    addresses = Column(JSON, nullable=False)
    # [
    #   {
    #     "type": "billing",
    #     "street": "123 Main St",
    #     "city": "Warsaw",
    #     "state": "Mazowieckie",
    #     "postal_code": "00-001",
    #     "country": "PL"
    #   }
    # ]
    
    # Business Information
    status = Column(SQLEnum(VendorStatus), default=VendorStatus.PENDING_APPROVAL, index=True)
    tier = Column(SQLEnum(VendorTier), default=VendorTier.TIER_4, index=True)
    business_type = Column(String(50), nullable=True)  # manufacturer, distributor, service
    industry_sectors = Column(JSON, nullable=True)  # ["automotive", "aerospace"]
    
    # Capabilities
    capabilities = Column(JSON, nullable=True)
    # {
    #   "manufacturing_processes": ["CNC Machining", "Injection Molding"],
    #   "materials": ["Steel", "Aluminum", "Plastic"],
    #   "certifications": ["ISO 9001", "AS9100"],
    #   "capacity": {"annual_revenue": "10M-50M", "employees": "100-500"}
    # }
    
    # Performance Metrics
    overall_rating = Column(Numeric(3, 2), default=0.0, index=True)
    quality_rating = Column(Numeric(3, 2), default=0.0)
    delivery_rating = Column(Numeric(3, 2), default=0.0)
    service_rating = Column(Numeric(3, 2), default=0.0)
    cost_competitiveness = Column(Numeric(3, 2), default=0.0)
    
    # Statistics
    total_orders = Column(Integer, default=0)
    total_spend_pln = Column(Numeric(15, 2), default=0.0)
    on_time_delivery_rate = Column(Float, default=0.0)  # Percentage
    quality_rejection_rate = Column(Float, default=0.0)  # Percentage
    
    # Financial Information
    payment_terms = Column(String(50), default="Net 30")
    currency = Column(String(3), default="PLN")
    credit_limit_pln = Column(Numeric(15, 2), nullable=True)
    
    # Compliance & Certifications
    certifications = Column(JSON, nullable=True)
    insurance_info = Column(JSON, nullable=True)
    compliance_status = Column(JSON, nullable=True)
    
    # Risk Assessment
    risk_score = Column(Float, default=0.0)  # 0-100
    risk_factors = Column(JSON, nullable=True)
    last_risk_assessment = Column(DateTime(timezone=True), nullable=True)
    
    # Sustainability
    sustainability_rating = Column(Float, nullable=True)
    environmental_certifications = Column(JSON, nullable=True)
    
    # Audit Fields
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    approved_by = relationship("User", foreign_keys=[approved_by_id])
    materials = relationship("MaterialVendor", back_populates="vendor")
    purchase_orders = relationship("PurchaseOrder", back_populates="vendor")
    performance_reviews = relationship("VendorPerformanceReview", back_populates="vendor")
    
    # Indexes
    __table_args__ = (
        Index('idx_vendor_status_tier', 'status', 'tier'),
        Index('idx_vendor_rating', 'overall_rating'),
        {'extend_existing': True}
    )


class MaterialVendor(Base):
    """Material-Vendor relationship with pricing and lead times"""
    __tablename__ = "material_vendors"

    id = Column(Integer, primary_key=True, index=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False, index=True)
    
    # Vendor Information
    vendor_part_number = Column(String(100), nullable=True)
    vendor_description = Column(Text, nullable=True)
    is_preferred = Column(Boolean, default=False, index=True)
    is_approved = Column(Boolean, default=False, index=True)
    
    # Pricing Information
    price_breaks = Column(JSON, nullable=True)
    # [
    #   {"min_qty": 1, "max_qty": 99, "unit_price": 10.50},
    #   {"min_qty": 100, "max_qty": 999, "unit_price": 9.75},
    #   {"min_qty": 1000, "max_qty": null, "unit_price": 8.90}
    # ]
    
    current_price_pln = Column(Numeric(12, 4), nullable=True)
    price_valid_from = Column(DateTime(timezone=True), nullable=True)
    price_valid_to = Column(DateTime(timezone=True), nullable=True)
    
    # Lead Times and MOQ
    lead_time_days = Column(Integer, default=30)
    minimum_order_qty = Column(Numeric(12, 2), default=1)
    order_multiple = Column(Numeric(12, 2), default=1)
    
    # Quality and Performance
    quality_rating = Column(Numeric(3, 2), default=0.0)
    delivery_performance = Column(Float, default=0.0)
    last_delivery_date = Column(DateTime(timezone=True), nullable=True)
    
    # Status
    status = Column(String(20), default="active", index=True)
    
    # Audit Fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    material = relationship("Material", back_populates="vendors")
    vendor = relationship("Vendor", back_populates="materials")
    
    # Indexes
    __table_args__ = (
        Index('idx_material_vendor_preferred', 'material_id', 'is_preferred'),
        Index('idx_vendor_material_approved', 'vendor_id', 'is_approved'),
        {'extend_existing': True}
    )


class InventoryLocation(Base):
    """Inventory storage locations"""
    __tablename__ = "inventory_locations"

    id = Column(Integer, primary_key=True, index=True)
    
    # Location Information
    location_code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    location_type = Column(String(50), nullable=False)  # warehouse, production, quarantine
    
    # Address
    address = Column(JSON, nullable=True)
    
    # Capacity
    total_capacity_m3 = Column(Numeric(12, 2), nullable=True)
    available_capacity_m3 = Column(Numeric(12, 2), nullable=True)
    
    # Environmental Conditions
    temperature_controlled = Column(Boolean, default=False)
    humidity_controlled = Column(Boolean, default=False)
    hazmat_approved = Column(Boolean, default=False)
    
    # Status
    is_active = Column(Boolean, default=True, index=True)
    
    # Audit Fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    inventory_items = relationship("InventoryItem", back_populates="location")
    
    __table_args__ = {'extend_existing': True}


class InventoryItem(Base):
    """Inventory tracking by material and location"""
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False, index=True)
    location_id = Column(Integer, ForeignKey("inventory_locations.id"), nullable=False, index=True)
    
    # Quantities
    on_hand_qty = Column(Numeric(12, 2), default=0, nullable=False)
    allocated_qty = Column(Numeric(12, 2), default=0, nullable=False)
    available_qty = Column(Numeric(12, 2), default=0, nullable=False)
    on_order_qty = Column(Numeric(12, 2), default=0, nullable=False)
    
    # Lot/Batch Information
    lot_number = Column(String(100), nullable=True, index=True)
    batch_number = Column(String(100), nullable=True, index=True)
    serial_numbers = Column(JSON, nullable=True)  # For serialized items
    
    # Dates
    received_date = Column(DateTime(timezone=True), nullable=True)
    expiry_date = Column(DateTime(timezone=True), nullable=True, index=True)
    last_counted_date = Column(DateTime(timezone=True), nullable=True)
    
    # Quality Status
    quality_status = Column(SQLEnum(QualityStatus), default=QualityStatus.PENDING, index=True)
    quarantine_reason = Column(Text, nullable=True)
    
    # Cost Information
    unit_cost_pln = Column(Numeric(12, 4), nullable=True)
    total_value_pln = Column(Numeric(15, 2), nullable=True)
    
    # Audit Fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    material = relationship("Material", back_populates="inventory_items")
    location = relationship("InventoryLocation", back_populates="inventory_items")
    transactions = relationship("InventoryTransaction", back_populates="inventory_item")
    
    # Indexes
    __table_args__ = (
        Index('idx_inventory_material_location', 'material_id', 'location_id'),
        Index('idx_inventory_quality_status', 'quality_status'),
        Index('idx_inventory_expiry', 'expiry_date'),
        {'extend_existing': True}
    )


class InventoryTransaction(Base):
    """Inventory movement transactions"""
    __tablename__ = "inventory_transactions"

    id = Column(Integer, primary_key=True, index=True)
    inventory_item_id = Column(Integer, ForeignKey("inventory_items.id"), nullable=False, index=True)
    
    # Transaction Details
    transaction_type = Column(SQLEnum(InventoryTransactionType), nullable=False, index=True)
    transaction_date = Column(DateTime(timezone=True), nullable=False, index=True)
    reference_number = Column(String(100), nullable=True, index=True)
    
    # Quantities
    quantity = Column(Numeric(12, 2), nullable=False)
    unit_cost_pln = Column(Numeric(12, 4), nullable=True)
    total_value_pln = Column(Numeric(15, 2), nullable=True)
    
    # Before/After Balances
    balance_before = Column(Numeric(12, 2), nullable=False)
    balance_after = Column(Numeric(12, 2), nullable=False)
    
    # Related Documents
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    
    # Additional Information
    reason_code = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    
    # User Information
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Audit Fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    inventory_item = relationship("InventoryItem", back_populates="transactions")
    purchase_order = relationship("PurchaseOrder", back_populates="inventory_transactions")
    order = relationship("Order", back_populates="inventory_transactions")
    created_by = relationship("User", foreign_keys=[created_by_id])
    
    # Indexes
    __table_args__ = (
        Index('idx_inventory_transaction_type_date', 'transaction_type', 'transaction_date'),
        Index('idx_transaction_reference', 'reference_number'),
        {'extend_existing': True}
    )


class PurchaseOrder(Base):
    """Purchase orders for material procurement"""
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    
    # Order Information
    po_number = Column(String(50), unique=True, nullable=False, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True, index=True)  # Related manufacturing order
    
    # Status and Dates
    status = Column(SQLEnum(PurchaseOrderStatus), default=PurchaseOrderStatus.DRAFT, index=True)
    order_date = Column(DateTime(timezone=True), nullable=False, index=True)
    required_date = Column(DateTime(timezone=True), nullable=True)
    promised_date = Column(DateTime(timezone=True), nullable=True)
    
    # Financial Information
    currency = Column(String(3), default="PLN")
    subtotal = Column(Numeric(15, 2), default=0)
    tax_amount = Column(Numeric(15, 2), default=0)
    shipping_cost = Column(Numeric(15, 2), default=0)
    total_amount = Column(Numeric(15, 2), default=0)
    
    # Terms and Conditions
    payment_terms = Column(String(100), nullable=True)
    shipping_terms = Column(String(100), nullable=True)
    delivery_address = Column(JSON, nullable=True)
    
    # Additional Information
    buyer_notes = Column(Text, nullable=True)
    vendor_notes = Column(Text, nullable=True)
    special_instructions = Column(Text, nullable=True)
    
    # Approval Workflow
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    
    # Audit Fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    vendor = relationship("Vendor", back_populates="purchase_orders")
    order = relationship("Order", back_populates="purchase_orders")
    created_by = relationship("User", foreign_keys=[created_by_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])
    items = relationship("PurchaseOrderItem", back_populates="purchase_order")
    receipts = relationship("MaterialReceipt", back_populates="purchase_order")
    inventory_transactions = relationship("InventoryTransaction", back_populates="purchase_order")
    invoices = relationship("Invoice", back_populates="purchase_order")
    
    # Indexes
    __table_args__ = (
        Index('idx_po_vendor_status', 'vendor_id', 'status'),
        Index('idx_po_order_date', 'order_date'),
        {'extend_existing': True}
    )


class PurchaseOrderItem(Base):
    """Purchase order line items"""
    __tablename__ = "purchase_order_items"

    id = Column(Integer, primary_key=True, index=True)
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False, index=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False, index=True)
    
    # Line Information
    line_number = Column(Integer, nullable=False)
    
    # Quantities
    ordered_qty = Column(Numeric(12, 2), nullable=False)
    received_qty = Column(Numeric(12, 2), default=0)
    invoiced_qty = Column(Numeric(12, 2), default=0)
    
    # Pricing
    unit_price = Column(Numeric(12, 4), nullable=False)
    line_total = Column(Numeric(15, 2), nullable=False)
    
    # Dates
    required_date = Column(DateTime(timezone=True), nullable=True)
    promised_date = Column(DateTime(timezone=True), nullable=True)
    
    # Additional Information
    vendor_part_number = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    
    # Status
    status = Column(String(20), default="open", index=True)
    
    # Audit Fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    purchase_order = relationship("PurchaseOrder", back_populates="items")
    material = relationship("Material", back_populates="purchase_order_items")
    receipt_items = relationship("MaterialReceiptItem", back_populates="po_item")
    
    # Indexes
    __table_args__ = (
        Index('idx_po_item_material', 'material_id'),
        Index('idx_po_item_status', 'status'),
        {'extend_existing': True}
    )


class MaterialReceipt(Base):
    """Material receipt records"""
    __tablename__ = "material_receipts"

    id = Column(Integer, primary_key=True, index=True)
    
    # Receipt Information
    receipt_number = Column(String(50), unique=True, nullable=False, index=True)
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False, index=True)
    
    # Dates
    receipt_date = Column(DateTime(timezone=True), nullable=False, index=True)
    delivery_date = Column(DateTime(timezone=True), nullable=True)
    
    # Delivery Information
    carrier = Column(String(100), nullable=True)
    tracking_number = Column(String(100), nullable=True)
    delivery_note_number = Column(String(100), nullable=True)
    
    # Quality Information
    inspection_required = Column(Boolean, default=False)
    inspection_completed = Column(Boolean, default=False)
    quality_status = Column(SQLEnum(QualityStatus), default=QualityStatus.PENDING)
    
    # Additional Information
    notes = Column(Text, nullable=True)
    
    # User Information
    received_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Audit Fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    purchase_order = relationship("PurchaseOrder", back_populates="receipts")
    received_by = relationship("User", foreign_keys=[received_by_id])
    items = relationship("MaterialReceiptItem", back_populates="receipt")
    
    # Indexes
    __table_args__ = (
        Index('idx_receipt_po_date', 'purchase_order_id', 'receipt_date'),
        Index('idx_receipt_quality_status', 'quality_status'),
    )


class MaterialReceiptItem(Base):
    """Material receipt line items"""
    __tablename__ = "material_receipt_items"

    id = Column(Integer, primary_key=True, index=True)
    receipt_id = Column(Integer, ForeignKey("material_receipts.id"), nullable=False, index=True)
    po_item_id = Column(Integer, ForeignKey("purchase_order_items.id"), nullable=False, index=True)
    
    # Quantities
    received_qty = Column(Numeric(12, 2), nullable=False)
    accepted_qty = Column(Numeric(12, 2), default=0)
    rejected_qty = Column(Numeric(12, 2), default=0)
    
    # Lot/Batch Information
    lot_number = Column(String(100), nullable=True)
    batch_number = Column(String(100), nullable=True)
    expiry_date = Column(DateTime(timezone=True), nullable=True)
    
    # Quality Information
    quality_status = Column(SQLEnum(QualityStatus), default=QualityStatus.PENDING)
    rejection_reason = Column(Text, nullable=True)
    
    # Location
    location_id = Column(Integer, ForeignKey("inventory_locations.id"), nullable=True)
    
    # Additional Information
    notes = Column(Text, nullable=True)
    
    # Audit Fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    receipt = relationship("MaterialReceipt", back_populates="items")
    po_item = relationship("PurchaseOrderItem", back_populates="receipt_items")
    location = relationship("InventoryLocation")


class QualityRecord(Base):
    """Quality inspection and testing records"""
    __tablename__ = "quality_records"

    id = Column(Integer, primary_key=True, index=True)
    
    # Reference Information
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False, index=True)
    receipt_item_id = Column(Integer, ForeignKey("material_receipt_items.id"), nullable=True, index=True)
    lot_number = Column(String(100), nullable=True, index=True)
    
    # Inspection Details
    inspection_date = Column(DateTime(timezone=True), nullable=False, index=True)
    inspection_type = Column(String(50), nullable=False)  # incoming, in-process, final
    inspector_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Test Results
    test_results = Column(JSON, nullable=True)
    # {
    #   "dimensional": {"length": 10.05, "width": 5.02, "tolerance": "±0.1"},
    #   "material": {"hardness": "HRC 48", "composition": "304 SS"},
    #   "visual": {"surface_finish": "Good", "defects": "None"}
    # }
    
    # Status and Decision
    quality_status = Column(SQLEnum(QualityStatus), nullable=False, index=True)
    disposition = Column(String(50), nullable=True)  # accept, reject, rework, use-as-is
    
    # Quantities
    inspected_qty = Column(Numeric(12, 2), nullable=False)
    accepted_qty = Column(Numeric(12, 2), default=0)
    rejected_qty = Column(Numeric(12, 2), default=0)
    
    # Additional Information
    defects_found = Column(JSON, nullable=True)
    corrective_actions = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    
    # Audit Fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    material = relationship("Material", back_populates="quality_records")
    receipt_item = relationship("MaterialReceiptItem")
    inspector = relationship("User", foreign_keys=[inspector_id])
    
    # Indexes
    __table_args__ = (
        Index('idx_quality_material_date', 'material_id', 'inspection_date'),
        Index('idx_quality_status', 'quality_status'),
    )


class VendorPerformanceReview(Base):
    """Vendor performance evaluation records"""
    __tablename__ = "vendor_performance_reviews"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False, index=True)
    
    # Review Period
    review_period_start = Column(DateTime(timezone=True), nullable=False)
    review_period_end = Column(DateTime(timezone=True), nullable=False)
    review_date = Column(DateTime(timezone=True), nullable=False, index=True)
    
    # Performance Metrics
    quality_score = Column(Numeric(3, 2), nullable=False)
    delivery_score = Column(Numeric(3, 2), nullable=False)
    service_score = Column(Numeric(3, 2), nullable=False)
    cost_score = Column(Numeric(3, 2), nullable=False)
    overall_score = Column(Numeric(3, 2), nullable=False)
    
    # Detailed Metrics
    performance_data = Column(JSON, nullable=True)
    # {
    #   "orders_count": 25,
    #   "total_value": 150000.00,
    #   "on_time_deliveries": 23,
    #   "quality_rejections": 2,
    #   "response_time_avg": 4.5,
    #   "cost_savings": 5000.00
    # }
    
    # Feedback
    strengths = Column(Text, nullable=True)
    areas_for_improvement = Column(Text, nullable=True)
    action_items = Column(JSON, nullable=True)
    
    # Review Information
    reviewed_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Audit Fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    vendor = relationship("Vendor", back_populates="performance_reviews")
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])
    
    # Indexes
    __table_args__ = (
        Index('idx_vendor_review_date', 'vendor_id', 'review_date'),
        Index('idx_review_period', 'review_period_start', 'review_period_end'),
    )


class BillOfMaterial(Base):
    """Bill of Materials for products/assemblies"""
    __tablename__ = "bill_of_materials"

    id = Column(Integer, primary_key=True, index=True)
    
    # Product Information
    product_code = Column(String(50), nullable=False, index=True)
    product_name = Column(String(255), nullable=False)
    version = Column(String(20), default="1.0")
    
    # BOM Information
    bom_type = Column(String(20), default="manufacturing")  # manufacturing, engineering, sales
    status = Column(String(20), default="active", index=True)
    effective_date = Column(DateTime(timezone=True), nullable=False)
    expiry_date = Column(DateTime(timezone=True), nullable=True)
    
    # Additional Information
    description = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    
    # Audit Fields
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    created_by = relationship("User", foreign_keys=[created_by_id])
    items = relationship("BillOfMaterialItem", back_populates="bom")
    
    # Indexes
    __table_args__ = (
        Index('idx_bom_product_version', 'product_code', 'version'),
        Index('idx_bom_status_effective', 'status', 'effective_date'),
    )


class BillOfMaterialItem(Base):
    """Bill of Material line items"""
    __tablename__ = "bill_of_material_items"

    id = Column(Integer, primary_key=True, index=True)
    bom_id = Column(Integer, ForeignKey("bill_of_materials.id"), nullable=False, index=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False, index=True)
    
    # Item Information
    item_number = Column(Integer, nullable=False)
    quantity_per = Column(Numeric(12, 4), nullable=False)
    unit_of_measure = Column(String(20), nullable=False)
    
    # Optional Information
    reference_designator = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    
    # Substitutes
    substitute_materials = Column(JSON, nullable=True)  # [material_id1, material_id2]
    
    # Audit Fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    bom = relationship("BillOfMaterial", back_populates="items")
    material = relationship("Material", back_populates="bom_items")
    
    # Indexes
    __table_args__ = (
        Index('idx_bom_item_material', 'material_id'),
        Index('idx_bom_item_number', 'bom_id', 'item_number'),
    ) 
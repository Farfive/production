"""
Supply Chain Management Schemas

Pydantic models for supply chain API requests and responses including
materials, vendors, inventory, purchase orders, and quality records.
"""

from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field, validator
from datetime import datetime
from decimal import Decimal
from enum import Enum


# Enums
class MaterialCategoryEnum(str, Enum):
    RAW_MATERIAL = "raw_material"
    COMPONENT = "component"
    ASSEMBLY = "assembly"
    CONSUMABLE = "consumable"
    TOOL = "tool"
    PACKAGING = "packaging"
    CHEMICAL = "chemical"
    ELECTRONIC = "electronic"


class MaterialStatusEnum(str, Enum):
    ACTIVE = "active"
    DISCONTINUED = "discontinued"
    OBSOLETE = "obsolete"
    RESTRICTED = "restricted"
    PENDING_APPROVAL = "pending_approval"


class VendorStatusEnum(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING_APPROVAL = "pending_approval"
    SUSPENDED = "suspended"
    BLACKLISTED = "blacklisted"


class VendorTierEnum(str, Enum):
    TIER_1 = "tier_1"
    TIER_2 = "tier_2"
    TIER_3 = "tier_3"
    TIER_4 = "tier_4"


class PurchaseOrderStatusEnum(str, Enum):
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


class InventoryTransactionTypeEnum(str, Enum):
    RECEIPT = "receipt"
    ISSUE = "issue"
    TRANSFER = "transfer"
    ADJUSTMENT = "adjustment"
    RETURN = "return"
    SCRAP = "scrap"
    CYCLE_COUNT = "cycle_count"


class QualityStatusEnum(str, Enum):
    PENDING = "pending"
    PASSED = "passed"
    FAILED = "failed"
    CONDITIONAL = "conditional"
    QUARANTINED = "quarantined"


# Base Schemas
class BaseSchema(BaseModel):
    class Config:
        from_attributes = True
        use_enum_values = True


# Material Schemas
class MaterialBase(BaseSchema):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    category: MaterialCategoryEnum
    status: MaterialStatusEnum = MaterialStatusEnum.ACTIVE
    material_group: Optional[str] = None
    commodity_code: Optional[str] = None
    hazmat_class: Optional[str] = None
    unit_of_measure: str = Field(..., min_length=1, max_length=20)
    weight_kg: Optional[Decimal] = None
    dimensions: Optional[Dict[str, Any]] = None
    volume_m3: Optional[Decimal] = None
    specifications: Optional[Dict[str, Any]] = None
    quality_standards: Optional[Dict[str, Any]] = None
    inspection_required: bool = False
    shelf_life_days: Optional[int] = None
    storage_conditions: Optional[Dict[str, Any]] = None
    safety_stock_qty: Decimal = Field(default=0, ge=0)
    reorder_point_qty: Decimal = Field(default=0, ge=0)
    economic_order_qty: Optional[Decimal] = None
    max_stock_qty: Optional[Decimal] = None
    procurement_lead_time_days: int = Field(default=30, ge=0)
    manufacturing_lead_time_days: Optional[int] = None
    sustainability_score: Optional[float] = Field(None, ge=0, le=100)
    carbon_footprint_kg: Optional[Decimal] = None
    recyclable: bool = False
    rohs_compliant: bool = True
    reach_compliant: bool = True
    conflict_minerals_free: bool = True


class MaterialCreate(MaterialBase):
    material_code: Optional[str] = None


class MaterialUpdate(BaseSchema):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[MaterialStatusEnum] = None
    specifications: Optional[Dict[str, Any]] = None
    safety_stock_qty: Optional[Decimal] = None
    reorder_point_qty: Optional[Decimal] = None


class MaterialResponse(MaterialBase):
    id: int
    material_code: str
    standard_cost_pln: Optional[Decimal] = None
    last_cost_pln: Optional[Decimal] = None
    average_cost_pln: Optional[Decimal] = None
    cost_updated_at: Optional[datetime] = None
    abc_classification: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class MaterialSearch(BaseSchema):
    search_text: Optional[str] = None
    category: Optional[MaterialCategoryEnum] = None
    status: Optional[MaterialStatusEnum] = None
    material_group: Optional[str] = None
    hazmat_class: Optional[str] = None
    inspection_required: Optional[bool] = None


# Vendor Schemas
class VendorBase(BaseSchema):
    company_name: str = Field(..., min_length=1, max_length=255)
    legal_name: Optional[str] = None
    duns_number: Optional[str] = None
    tax_id: Optional[str] = None
    primary_contact: Optional[Dict[str, Any]] = None
    addresses: List[Dict[str, Any]] = Field(default_factory=list)
    status: VendorStatusEnum = VendorStatusEnum.PENDING_APPROVAL
    tier: VendorTierEnum = VendorTierEnum.TIER_4
    business_type: Optional[str] = None
    industry_sectors: Optional[List[str]] = None
    capabilities: Optional[Dict[str, Any]] = None
    payment_terms: str = "Net 30"
    currency: str = "PLN"
    credit_limit_pln: Optional[Decimal] = None
    certifications: Optional[Dict[str, Any]] = None
    insurance_info: Optional[Dict[str, Any]] = None
    compliance_status: Optional[Dict[str, Any]] = None
    sustainability_rating: Optional[float] = Field(None, ge=0, le=100)
    environmental_certifications: Optional[Dict[str, Any]] = None


class VendorCreate(VendorBase):
    vendor_code: Optional[str] = None


class VendorUpdate(BaseSchema):
    company_name: Optional[str] = None
    status: Optional[VendorStatusEnum] = None
    tier: Optional[VendorTierEnum] = None
    capabilities: Optional[Dict[str, Any]] = None
    payment_terms: Optional[str] = None
    certifications: Optional[Dict[str, Any]] = None


class VendorResponse(VendorBase):
    id: int
    vendor_code: str
    overall_rating: Decimal
    quality_rating: Decimal
    delivery_rating: Decimal
    service_rating: Decimal
    cost_competitiveness: Decimal
    total_orders: int
    total_spend_pln: Decimal
    on_time_delivery_rate: float
    quality_rejection_rate: float
    risk_score: float
    risk_factors: Optional[Dict[str, Any]] = None
    last_risk_assessment: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class VendorSearch(BaseSchema):
    search_text: Optional[str] = None
    status: Optional[VendorStatusEnum] = None
    tier: Optional[VendorTierEnum] = None
    business_type: Optional[str] = None
    capabilities: Optional[List[str]] = None
    min_rating: Optional[float] = Field(None, ge=0, le=5)


# Material-Vendor Relationship Schemas
class MaterialVendorBase(BaseSchema):
    vendor_part_number: Optional[str] = None
    vendor_description: Optional[str] = None
    is_preferred: bool = False
    is_approved: bool = False
    price_breaks: Optional[List[Dict[str, Any]]] = None
    current_price_pln: Optional[Decimal] = None
    price_valid_from: Optional[datetime] = None
    price_valid_to: Optional[datetime] = None
    lead_time_days: int = Field(default=30, ge=0)
    minimum_order_qty: Decimal = Field(default=1, ge=0)
    order_multiple: Decimal = Field(default=1, ge=0)
    status: str = "active"


class MaterialVendorCreate(MaterialVendorBase):
    vendor_id: int


class MaterialVendorResponse(MaterialVendorBase):
    id: int
    material_id: int
    vendor_id: int
    quality_rating: Decimal
    delivery_performance: float
    last_delivery_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


# Inventory Schemas
class InventoryLocationResponse(BaseSchema):
    id: int
    location_code: str
    name: str
    description: Optional[str] = None
    location_type: str
    address: Optional[Dict[str, Any]] = None
    total_capacity_m3: Optional[Decimal] = None
    available_capacity_m3: Optional[Decimal] = None
    temperature_controlled: bool
    humidity_controlled: bool
    hazmat_approved: bool
    is_active: bool


class InventoryItemResponse(BaseSchema):
    id: int
    material_id: int
    location_id: int
    on_hand_qty: Decimal
    allocated_qty: Decimal
    available_qty: Decimal
    on_order_qty: Decimal
    lot_number: Optional[str] = None
    batch_number: Optional[str] = None
    serial_numbers: Optional[List[str]] = None
    received_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    last_counted_date: Optional[datetime] = None
    quality_status: QualityStatusEnum
    quarantine_reason: Optional[str] = None
    unit_cost_pln: Optional[Decimal] = None
    total_value_pln: Optional[Decimal] = None
    created_at: datetime
    updated_at: datetime


class InventoryTransactionBase(BaseSchema):
    inventory_item_id: int
    transaction_type: InventoryTransactionTypeEnum
    transaction_date: Optional[datetime] = None
    reference_number: Optional[str] = None
    quantity: Decimal = Field(..., ne=0)
    unit_cost_pln: Optional[Decimal] = None
    total_value_pln: Optional[Decimal] = None
    purchase_order_id: Optional[int] = None
    order_id: Optional[int] = None
    reason_code: Optional[str] = None
    notes: Optional[str] = None


class InventoryTransactionCreate(InventoryTransactionBase):
    pass


class InventoryTransactionResponse(InventoryTransactionBase):
    id: int
    balance_before: Decimal
    balance_after: Decimal
    created_by_id: int
    created_at: datetime


class InventorySummaryResponse(BaseSchema):
    total_items: int
    total_value: float
    low_stock_items: List[Dict[str, Any]]
    expired_items: List[Dict[str, Any]]
    quarantined_items: List[Dict[str, Any]]


class InventoryTurnoverResponse(BaseSchema):
    period_days: int
    total_usage_value: float
    average_inventory_value: float
    turnover_ratio: float
    days_of_supply: float


# Purchase Order Schemas
class PurchaseOrderItemBase(BaseSchema):
    material_id: int
    ordered_qty: Decimal = Field(..., gt=0)
    unit_price: Decimal = Field(..., gt=0)
    required_date: Optional[datetime] = None
    promised_date: Optional[datetime] = None
    vendor_part_number: Optional[str] = None
    notes: Optional[str] = None


class PurchaseOrderItemCreate(PurchaseOrderItemBase):
    pass


class PurchaseOrderItemResponse(PurchaseOrderItemBase):
    id: int
    purchase_order_id: int
    line_number: int
    received_qty: Decimal
    invoiced_qty: Decimal
    line_total: Decimal
    status: str
    created_at: datetime
    updated_at: datetime


class PurchaseOrderBase(BaseSchema):
    vendor_id: int
    order_id: Optional[int] = None
    required_date: Optional[datetime] = None
    promised_date: Optional[datetime] = None
    currency: str = "PLN"
    tax_amount: Decimal = Field(default=0, ge=0)
    shipping_cost: Decimal = Field(default=0, ge=0)
    payment_terms: Optional[str] = None
    shipping_terms: Optional[str] = None
    delivery_address: Optional[Dict[str, Any]] = None
    buyer_notes: Optional[str] = None
    vendor_notes: Optional[str] = None
    special_instructions: Optional[str] = None


class PurchaseOrderCreate(PurchaseOrderBase):
    po_number: Optional[str] = None
    items: List[PurchaseOrderItemCreate] = Field(..., min_items=1)


class PurchaseOrderUpdate(BaseSchema):
    status: Optional[PurchaseOrderStatusEnum] = None
    promised_date: Optional[datetime] = None
    vendor_notes: Optional[str] = None


class PurchaseOrderResponse(PurchaseOrderBase):
    id: int
    po_number: str
    status: PurchaseOrderStatusEnum
    order_date: datetime
    subtotal: Decimal
    total_amount: Decimal
    created_by_id: int
    approved_by_id: Optional[int] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    items: List[PurchaseOrderItemResponse] = []


# Material Receipt Schemas
class MaterialReceiptItemBase(BaseSchema):
    po_item_id: int
    received_qty: Decimal = Field(..., gt=0)
    accepted_qty: Decimal = Field(default=0, ge=0)
    rejected_qty: Decimal = Field(default=0, ge=0)
    lot_number: Optional[str] = None
    batch_number: Optional[str] = None
    expiry_date: Optional[datetime] = None
    quality_status: QualityStatusEnum = QualityStatusEnum.PENDING
    rejection_reason: Optional[str] = None
    location_id: Optional[int] = None
    notes: Optional[str] = None


class MaterialReceiptItemCreate(MaterialReceiptItemBase):
    pass


class MaterialReceiptItemResponse(MaterialReceiptItemBase):
    id: int
    receipt_id: int
    created_at: datetime
    updated_at: datetime


class MaterialReceiptBase(BaseSchema):
    purchase_order_id: int
    delivery_date: Optional[datetime] = None
    carrier: Optional[str] = None
    tracking_number: Optional[str] = None
    delivery_note_number: Optional[str] = None
    inspection_required: bool = False
    inspection_completed: bool = False
    quality_status: QualityStatusEnum = QualityStatusEnum.PENDING
    notes: Optional[str] = None


class MaterialReceiptCreate(MaterialReceiptBase):
    receipt_number: Optional[str] = None
    items: List[MaterialReceiptItemCreate] = Field(..., min_items=1)


class MaterialReceiptResponse(MaterialReceiptBase):
    id: int
    receipt_number: str
    receipt_date: datetime
    received_by_id: int
    created_at: datetime
    updated_at: datetime
    items: List[MaterialReceiptItemResponse] = []


# Quality Record Schemas
class QualityRecordBase(BaseSchema):
    material_id: int
    receipt_item_id: Optional[int] = None
    lot_number: Optional[str] = None
    inspection_type: str = Field(..., min_length=1)
    test_results: Optional[Dict[str, Any]] = None
    quality_status: QualityStatusEnum
    disposition: Optional[str] = None
    inspected_qty: Decimal = Field(..., gt=0)
    accepted_qty: Decimal = Field(default=0, ge=0)
    rejected_qty: Decimal = Field(default=0, ge=0)
    defects_found: Optional[Dict[str, Any]] = None
    corrective_actions: Optional[str] = None
    notes: Optional[str] = None


class QualityRecordCreate(QualityRecordBase):
    pass


class QualityRecordResponse(QualityRecordBase):
    id: int
    inspection_date: datetime
    inspector_id: int
    created_at: datetime
    updated_at: datetime


# Performance and Analytics Schemas
class VendorPerformanceResponse(BaseSchema):
    period_days: int
    total_orders: int
    total_value: float
    on_time_delivery_rate: float
    quality_pass_rate: float
    average_order_value: float
    orders_by_status: Dict[str, int]


class SupplyChainKPIResponse(BaseSchema):
    period: Dict[str, Any]
    procurement_kpis: Dict[str, float]
    inventory_kpis: Dict[str, float]
    quality_kpis: Dict[str, float]
    delivery_kpis: Dict[str, float]


class ABCAnalysisResponse(BaseSchema):
    analysis_date: datetime
    total_materials: int
    categories: Dict[str, Dict[str, Any]]


class VendorSpendAnalysisResponse(BaseSchema):
    period_days: int
    total_spend: float
    vendor_count: int
    top_vendors: List[Dict[str, Any]]
    spend_by_category: Dict[str, float]
    spend_trend: List[Dict[str, Any]]
    concentration_risk: Dict[str, Any]


class MaterialShortageForecastResponse(BaseSchema):
    forecast_period_days: int
    analysis_date: datetime
    potential_shortages: List[Dict[str, Any]]
    recommendations: List[Dict[str, Any]]
    risk_summary: Dict[str, int]


class SupplierRiskAssessmentResponse(BaseSchema):
    assessment_date: datetime
    total_suppliers: int
    risk_distribution: Dict[str, int]
    risk_factors: Dict[str, List[Dict[str, Any]]]
    mitigation_recommendations: List[Dict[str, Any]]


# Bill of Materials Schemas
class BillOfMaterialItemBase(BaseSchema):
    material_id: int
    item_number: int
    quantity_per: Decimal = Field(..., gt=0)
    unit_of_measure: str = Field(..., min_length=1, max_length=20)
    reference_designator: Optional[str] = None
    notes: Optional[str] = None
    substitute_materials: Optional[List[int]] = None


class BillOfMaterialItemCreate(BillOfMaterialItemBase):
    pass


class BillOfMaterialItemResponse(BillOfMaterialItemBase):
    id: int
    bom_id: int
    created_at: datetime
    updated_at: datetime


class BillOfMaterialBase(BaseSchema):
    product_code: str = Field(..., min_length=1, max_length=50)
    product_name: str = Field(..., min_length=1, max_length=255)
    version: str = "1.0"
    bom_type: str = "manufacturing"
    status: str = "active"
    effective_date: datetime
    expiry_date: Optional[datetime] = None
    description: Optional[str] = None
    notes: Optional[str] = None


class BillOfMaterialCreate(BillOfMaterialBase):
    items: List[BillOfMaterialItemCreate] = Field(..., min_items=1)


class BillOfMaterialResponse(BillOfMaterialBase):
    id: int
    created_by_id: int
    created_at: datetime
    updated_at: datetime
    items: List[BillOfMaterialItemResponse] = [] 
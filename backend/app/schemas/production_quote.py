from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal
from enum import Enum

from app.models.quote import ProductionQuoteType


class ProductionQuoteCreate(BaseModel):
    """Schema for creating a new production quote"""
    production_quote_type: ProductionQuoteType
    title: str = Field(..., min_length=5, max_length=200)
    description: Optional[str] = None
    
    # Availability & Timing
    available_from: Optional[datetime] = None
    available_until: Optional[datetime] = None
    lead_time_days: Optional[int] = Field(None, ge=1, le=365)
    
    # Pricing Structure
    pricing_model: str = Field(..., pattern="^(fixed|hourly|per_unit|tiered)$")
    base_price: Optional[Decimal] = Field(None, ge=0)
    pricing_details: Dict[str, Any] = Field(default_factory=dict)
    currency: str = Field(default="PLN", pattern="^[A-Z]{3}$")
    
    # Capabilities & Specifications
    manufacturing_processes: List[str] = Field(default_factory=list)
    materials: List[str] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)
    specialties: List[str] = Field(default_factory=list)
    
    # Constraints
    minimum_quantity: Optional[int] = Field(None, ge=1)
    maximum_quantity: Optional[int] = Field(None, ge=1)
    minimum_order_value: Optional[Decimal] = Field(None, ge=0)
    maximum_order_value: Optional[Decimal] = Field(None, ge=0)
    
    # Geographic preferences
    preferred_countries: List[str] = Field(default_factory=list)
    shipping_options: List[str] = Field(default_factory=list)
    
    # Visibility & Status
    is_public: bool = True
    priority_level: int = Field(default=1, ge=1, le=5)
    
    # Terms and conditions
    payment_terms: Optional[str] = None
    warranty_terms: Optional[str] = None
    special_conditions: Optional[str] = None
    
    # Metadata
    expires_at: Optional[datetime] = None
    
    # Additional features
    tags: List[str] = Field(default_factory=list)
    attachments: List[Dict[str, Any]] = Field(default_factory=list)
    sample_images: List[str] = Field(default_factory=list)
    
    @validator('maximum_quantity')
    def validate_max_quantity(cls, v, values):
        if v is not None and 'minimum_quantity' in values and values['minimum_quantity'] is not None:
            if v < values['minimum_quantity']:
                raise ValueError('maximum_quantity must be greater than or equal to minimum_quantity')
        return v
    
    @validator('maximum_order_value')
    def validate_max_order_value(cls, v, values):
        if v is not None and 'minimum_order_value' in values and values['minimum_order_value'] is not None:
            if v < values['minimum_order_value']:
                raise ValueError('maximum_order_value must be greater than or equal to minimum_order_value')
        return v
    
    @validator('available_until')
    def validate_availability_dates(cls, v, values):
        if v is not None and 'available_from' in values and values['available_from'] is not None:
            if v <= values['available_from']:
                raise ValueError('available_until must be after available_from')
        return v


class ProductionQuoteUpdate(BaseModel):
    """Schema for updating a production quote"""
    title: Optional[str] = Field(None, min_length=5, max_length=200)
    description: Optional[str] = None
    
    # Availability & Timing
    available_from: Optional[datetime] = None
    available_until: Optional[datetime] = None
    lead_time_days: Optional[int] = Field(None, ge=1, le=365)
    
    # Pricing Structure
    pricing_model: Optional[str] = Field(None, pattern="^(fixed|hourly|per_unit|tiered)$")
    base_price: Optional[Decimal] = Field(None, ge=0)
    pricing_details: Optional[Dict[str, Any]] = None
    
    # Capabilities & Specifications
    manufacturing_processes: Optional[List[str]] = None
    materials: Optional[List[str]] = None
    certifications: Optional[List[str]] = None
    specialties: Optional[List[str]] = None
    
    # Constraints
    minimum_quantity: Optional[int] = Field(None, ge=1)
    maximum_quantity: Optional[int] = Field(None, ge=1)
    minimum_order_value: Optional[Decimal] = Field(None, ge=0)
    maximum_order_value: Optional[Decimal] = Field(None, ge=0)
    
    # Geographic preferences
    preferred_countries: Optional[List[str]] = None
    shipping_options: Optional[List[str]] = None
    
    # Visibility & Status
    is_public: Optional[bool] = None
    is_active: Optional[bool] = None
    priority_level: Optional[int] = Field(None, ge=1, le=5)
    
    # Terms and conditions
    payment_terms: Optional[str] = None
    warranty_terms: Optional[str] = None
    special_conditions: Optional[str] = None
    
    # Metadata
    expires_at: Optional[datetime] = None
    
    # Additional features
    tags: Optional[List[str]] = None
    attachments: Optional[List[Dict[str, Any]]] = None
    sample_images: Optional[List[str]] = None


class ProductionQuoteResponse(BaseModel):
    """Schema for production quote responses"""
    id: int
    manufacturer_id: int
    production_quote_type: ProductionQuoteType
    title: str
    description: Optional[str]
    
    # Availability & Timing
    available_from: Optional[datetime]
    available_until: Optional[datetime]
    lead_time_days: Optional[int]
    
    # Pricing Structure
    pricing_model: str
    base_price: Optional[Decimal]
    pricing_details: Dict[str, Any]
    currency: str
    
    # Capabilities & Specifications
    manufacturing_processes: List[str]
    materials: List[str]
    certifications: List[str]
    specialties: List[str]
    
    # Constraints
    minimum_quantity: Optional[int]
    maximum_quantity: Optional[int]
    minimum_order_value: Optional[Decimal]
    maximum_order_value: Optional[Decimal]
    
    # Geographic preferences
    preferred_countries: List[str]
    shipping_options: List[str]
    
    # Visibility & Status
    is_public: bool
    is_active: bool
    priority_level: int
    
    # Terms and conditions
    payment_terms: Optional[str]
    warranty_terms: Optional[str]
    special_conditions: Optional[str]
    
    # Metadata
    created_at: datetime
    updated_at: datetime
    expires_at: Optional[datetime]
    
    # Analytics
    view_count: int
    inquiry_count: int
    conversion_count: int
    last_viewed_at: Optional[datetime]
    
    # Additional features
    tags: List[str]
    attachments: List[Dict[str, Any]]
    sample_images: List[str]
    
    # Computed properties
    is_valid: bool
    is_available_now: bool
    
    class Config:
        from_attributes = True


class ProductionQuoteInquiryCreate(BaseModel):
    """Schema for creating a production quote inquiry"""
    message: str = Field(..., min_length=10, max_length=2000)
    estimated_quantity: Optional[int] = Field(None, ge=1)
    estimated_budget: Optional[Decimal] = Field(None, ge=0)
    timeline: Optional[str] = Field(None, max_length=100)
    
    # Requirements
    specific_requirements: Dict[str, Any] = Field(default_factory=dict)
    preferred_delivery_date: Optional[datetime] = None


class ProductionQuoteInquiryResponse(BaseModel):
    """Schema for production quote inquiry responses"""
    id: int
    production_quote_id: int
    client_id: int
    
    # Inquiry details
    message: str
    estimated_quantity: Optional[int]
    estimated_budget: Optional[Decimal]
    timeline: Optional[str]
    
    # Requirements
    specific_requirements: Dict[str, Any]
    preferred_delivery_date: Optional[datetime]
    
    # Status and response
    status: str
    manufacturer_response: Optional[str]
    responded_at: Optional[datetime]
    
    # Conversion tracking
    converted_to_order_id: Optional[int]
    converted_to_quote_id: Optional[int]
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ProductionQuoteInquiryUpdate(BaseModel):
    """Schema for updating a production quote inquiry (manufacturer response)"""
    manufacturer_response: str = Field(..., min_length=10, max_length=2000)
    status: Optional[str] = Field(None, pattern="^(pending|responded|converted|closed)$")


class ProductionQuoteFilterCriteria(BaseModel):
    """Schema for filtering production quotes"""
    production_quote_type: Optional[ProductionQuoteType] = None
    manufacturing_processes: Optional[List[str]] = None
    materials: Optional[List[str]] = None
    certifications: Optional[List[str]] = None
    specialties: Optional[List[str]] = None
    
    # Geographic filters
    countries: Optional[List[str]] = None
    
    # Pricing filters
    min_price: Optional[Decimal] = None
    max_price: Optional[Decimal] = None
    pricing_model: Optional[str] = None
    
    # Availability filters
    available_from: Optional[datetime] = None
    available_until: Optional[datetime] = None
    max_lead_time_days: Optional[int] = None
    
    # Quantity filters
    required_quantity: Optional[int] = None
    
    # Status filters
    is_active: Optional[bool] = True
    is_public: Optional[bool] = True
    
    # Search
    search_query: Optional[str] = None
    
    # Sorting
    sort_by: Optional[str] = Field(None, pattern="^(created_at|updated_at|priority_level|view_count|base_price)$")
    sort_order: Optional[str] = Field(default="desc", pattern="^(asc|desc)$")
    
    # Pagination
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class ProductionQuoteMatch(BaseModel):
    """Schema for production quote matches with orders"""
    production_quote: ProductionQuoteResponse
    match_score: float = Field(..., ge=0.0, le=1.0)
    match_reasons: List[str]
    estimated_price: Optional[Decimal]
    availability_status: str
    
    class Config:
        from_attributes = True


class ProductionQuoteAnalytics(BaseModel):
    """Schema for production quote analytics"""
    total_production_quotes: int
    active_production_quotes: int
    total_views: int
    total_inquiries: int
    total_conversions: int
    
    # Performance metrics
    average_conversion_rate: float
    top_performing_quotes: List[ProductionQuoteResponse]
    
    # Trends
    views_trend: List[Dict[str, Any]]
    inquiries_trend: List[Dict[str, Any]]
    conversions_trend: List[Dict[str, Any]]
    
    class Config:
        from_attributes = True 
from pydantic import BaseModel, Field, model_validator
from typing import Optional, Any, Dict, List
from datetime import datetime
from decimal import Decimal


class CostBreakdown(BaseModel):
    materials: Decimal = Field(default=0, ge=0)
    labor: Decimal = Field(default=0, ge=0)
    overhead: Decimal = Field(default=0, ge=0)
    shipping: Decimal = Field(default=0, ge=0)
    taxes: Decimal = Field(default=0, ge=0)
    total: Decimal = Field(default=0, ge=0)


class QuoteAttachment(BaseModel):
    id: Optional[int] = None
    name: str
    url: str
    size: int
    type: str
    uploaded_at: Optional[datetime] = None


class QuoteBase(BaseModel):
    order_id: int
    price: Decimal = Field(..., gt=0)
    currency: str = "USD"
    delivery_days: int = Field(..., gt=0)
    description: str
    includes_shipping: bool = True
    payment_terms: Optional[str] = None
    notes: Optional[str] = None
    
    # New fields to match frontend
    material: Optional[str] = None
    process: Optional[str] = None
    finish: Optional[str] = None
    tolerance: Optional[str] = None
    quantity: Optional[int] = None
    shipping_method: Optional[str] = None
    warranty: Optional[str] = None
    breakdown: Optional[CostBreakdown] = None


class QuoteCreate(QuoteBase):
    valid_until: Optional[datetime] = None


class QuoteUpdate(BaseModel):
    price: Optional[Decimal] = Field(None, gt=0)
    delivery_days: Optional[int] = Field(None, gt=0)
    description: Optional[str] = None
    includes_shipping: Optional[bool] = None
    payment_terms: Optional[str] = None
    notes: Optional[str] = None
    valid_until: Optional[datetime] = None
    material: Optional[str] = None
    process: Optional[str] = None
    finish: Optional[str] = None
    tolerance: Optional[str] = None
    quantity: Optional[int] = None
    shipping_method: Optional[str] = None
    warranty: Optional[str] = None
    breakdown: Optional[CostBreakdown] = None


class QuoteNegotiation(BaseModel):
    quote_id: int
    message: str
    requested_price: Optional[Decimal] = None
    requested_delivery_days: Optional[int] = None
    changes_requested: Optional[Dict[str, Any]] = None


class QuoteRevision(BaseModel):
    original_quote_id: int
    price: Decimal = Field(..., gt=0)
    delivery_days: int = Field(..., gt=0)
    description: str
    changes_made: str
    revision_notes: Optional[str] = None
    breakdown: Optional[CostBreakdown] = None


class QuoteResponse(BaseModel):
    id: int
    order_id: int
    manufacturer_id: int
    price: Decimal
    currency: str = "PLN"
    delivery_days: int
    description: str
    includes_shipping: bool = True
    payment_terms: Optional[str] = None
    notes: Optional[str] = None
    status: str
    valid_until: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    
    # Enhanced fields
    material: Optional[str] = None
    process: Optional[str] = None
    finish: Optional[str] = None
    tolerance: Optional[str] = None
    quantity: Optional[int] = None
    shipping_method: Optional[str] = None
    warranty: Optional[str] = None
    breakdown: Optional[CostBreakdown] = None
    attachments: Optional[List[QuoteAttachment]] = None
    revision_count: Optional[int] = 0
    original_quote_id: Optional[int] = None
    
    @model_validator(mode='before')
    @classmethod
    def map_quote_fields(cls, data: Any) -> Any:
        """Map Quote model fields to API response fields"""
        if hasattr(data, '__dict__'):  # SQLAlchemy model
            # Convert SQLAlchemy model to dict
            quote_dict = {
                'id': data.id,
                'order_id': data.order_id,
                'manufacturer_id': data.manufacturer_id,
                'price': data.total_price_pln,
                'currency': 'PLN',
                'delivery_days': data.lead_time_days,
                'description': data.client_message or '',
                'includes_shipping': True,
                'payment_terms': getattr(data, 'payment_terms', None),
                'notes': getattr(data, 'internal_notes', None),
                'status': data.status.value if hasattr(data.status, 'value') else str(data.status),
                'valid_until': data.valid_until,
                'created_at': data.created_at,
                'updated_at': data.updated_at,
                'accepted_at': getattr(data, 'accepted_at', None),
                'rejection_reason': getattr(data, 'client_response', None),
                'material': getattr(data, 'material', None),
                'process': getattr(data, 'process', None),
                'finish': getattr(data, 'finish', None),
                'tolerance': getattr(data, 'tolerance', None),
                'quantity': getattr(data, 'quantity', None),
                'shipping_method': getattr(data, 'shipping_method', None),
                'warranty': getattr(data, 'warranty', None),
                'revision_count': getattr(data, 'revision_count', 0),
                'original_quote_id': getattr(data, 'original_quote_id', None),
            }
            
            # Handle breakdown
            if hasattr(data, 'pricing_breakdown') and data.pricing_breakdown:
                breakdown_data = data.pricing_breakdown
                if isinstance(breakdown_data, dict):
                    quote_dict['breakdown'] = {
                        'materials': breakdown_data.get('materials', 0),
                        'labor': breakdown_data.get('labor', 0),
                        'overhead': breakdown_data.get('overhead', 0),
                        'shipping': breakdown_data.get('shipping', 0),
                        'taxes': breakdown_data.get('taxes', 0),
                        'total': breakdown_data.get('total', quote_dict['price'])
                    }
            
            return quote_dict
        return data
    
    class Config:
        from_attributes = True


class QuoteWithOrder(QuoteResponse):
    order_title: str
    order_status: str
    client_name: str


class QuoteNegotiationResponse(BaseModel):
    id: int
    quote_id: int
    message: str
    requested_price: Optional[Decimal] = None
    requested_delivery_days: Optional[int] = None
    changes_requested: Optional[Dict[str, Any]] = None
    created_at: datetime
    created_by: int
    status: str  # 'pending', 'accepted', 'rejected', 'counter_offered'


class QuoteFileUpload(BaseModel):
    quote_id: int
    files: List[str]  # List of file paths/URLs


class QuoteComparisonData(BaseModel):
    order_id: int
    quotes: List[QuoteResponse]
    criteria_weights: Optional[Dict[str, float]] = None
    recommendations: Optional[List[Dict[str, Any]]] = None


class QuoteAnalytics(BaseModel):
    """Advanced quote analytics"""
    quote_id: str
    score: float
    rank: int
    total_cost_of_ownership: float
    risk_assessment: Dict[str, Any]
    market_position: str  # "lowest", "competitive", "premium"
    savings_vs_average: float
    delivery_competitiveness: float
    quality_score: float
    compliance_score: float
    sustainability_score: Optional[float] = None


class QuoteComparison(BaseModel):
    """Enhanced quote comparison with analytics"""
    quote_id: str
    manufacturer_name: str
    price: float
    delivery_days: int
    score: float
    analytics: QuoteAnalytics
    strengths: List[str]
    weaknesses: List[str]
    risk_factors: List[str]


class DecisionMatrix(BaseModel):
    """Decision support matrix"""
    criteria: Dict[str, float]  # criteria weights
    quotes: List[QuoteComparison]
    recommendation: QuoteComparison
    alternatives: List[QuoteComparison]
    decision_rationale: str


class QuoteComparisonReport(BaseModel):
    """Comprehensive comparison report"""
    order_id: int
    generated_at: datetime
    total_quotes: int
    decision_matrix: DecisionMatrix
    market_analysis: Dict[str, Any]
    cost_breakdown: Dict[str, Any]
    timeline_analysis: Dict[str, Any]
    risk_analysis: Dict[str, Any]
    recommendations: List[str]


class QuoteFilterCriteria(BaseModel):
    """Advanced filtering criteria"""
    max_price: Optional[float] = None
    max_delivery_days: Optional[int] = None
    min_rating: Optional[float] = None
    required_certifications: Optional[List[str]] = None
    preferred_locations: Optional[List[str]] = None
    risk_tolerance: Optional[str] = None  # "low", "medium", "high"
    sustainability_requirements: Optional[bool] = None


class QuoteBenchmark(BaseModel):
    """Quote benchmarking data"""
    industry_average_price: float
    industry_average_delivery: int
    market_percentile: int  # where this quote ranks (0-100)
    competitive_advantage: List[str]
    improvement_suggestions: List[str]


class QuoteBulkAction(BaseModel):
    """Bulk action request for quotes"""
    action: str  # 'accept', 'reject', 'withdraw', 'delete'
    quote_ids: List[int]
    reason: Optional[str] = None


class QuoteAnalyticsOverview(BaseModel):
    """Analytics overview for quotes"""
    total_quotes: int
    pending_quotes: int
    accepted_quotes: int
    rejected_quotes: int
    win_rate: float
    average_quote_value: float
    total_value: float
    response_time_avg: float  # in hours
    recent_activity: List[Dict[str, Any]] 
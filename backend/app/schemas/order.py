from pydantic import BaseModel, validator, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

from app.models.order import OrderStatus, Priority


class OrderBase(BaseModel):
    """Base order schema"""
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=10)
    technology: str = Field(..., min_length=1)
    material: str = Field(..., min_length=1)
    quantity: int = Field(..., gt=0)
    budget_pln: float = Field(..., gt=0)
    delivery_deadline: datetime
    priority: Priority = Priority.NORMAL
    preferred_location: Optional[str] = None
    specifications: Optional[Dict[str, Any]] = None


class OrderCreate(OrderBase):
    """Schema for order creation"""
    attachments: Optional[List[str]] = None
    
    @validator('delivery_deadline')
    def validate_deadline(cls, v):
        from datetime import timezone
        now = datetime.now(timezone.utc) if v.tzinfo else datetime.now()
        if v <= now:
            raise ValueError('Delivery deadline must be in the future')
        return v


class OrderUpdate(BaseModel):
    """Schema for order updates"""
    title: Optional[str] = None
    description: Optional[str] = None
    budget_pln: Optional[float] = None
    delivery_deadline: Optional[datetime] = None
    priority: Optional[Priority] = None
    preferred_location: Optional[str] = None
    specifications: Optional[Dict[str, Any]] = None
    attachments: Optional[List[str]] = None


class OrderResponse(OrderBase):
    """Schema for order response"""
    id: int
    client_id: int
    status: OrderStatus
    matched_at: Optional[datetime]
    selected_quote_id: Optional[int]
    production_started_at: Optional[datetime]
    estimated_completion: Optional[datetime]
    actual_completion: Optional[datetime]
    client_rating: Optional[int]
    client_feedback: Optional[str]
    attachments: Optional[List[str]]
    created_at: datetime
    updated_at: datetime
    
    # Computed properties
    is_active: bool
    is_completed: bool
    is_overdue: bool
    days_until_deadline: Optional[int]
    
    class Config:
        from_attributes = True


class OrderListResponse(BaseModel):
    """Schema for order list response"""
    orders: List[OrderResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class OrderStatusUpdate(BaseModel):
    """Schema for order status updates"""
    status: OrderStatus
    notes: Optional[str] = None
    estimated_completion: Optional[datetime] = None


class OrderFeedback(BaseModel):
    """Schema for client feedback on completed order"""
    rating: int = Field(..., ge=1, le=5)
    feedback: Optional[str] = None
    
    @validator('rating')
    def validate_rating(cls, v):
        if v < 1 or v > 5:
            raise ValueError('Rating must be between 1 and 5')
        return v


class OrderSearch(BaseModel):
    """Schema for order search filters"""
    status: Optional[OrderStatus] = None
    technology: Optional[str] = None
    material: Optional[str] = None
    min_budget: Optional[float] = None
    max_budget: Optional[float] = None
    location: Optional[str] = None
    priority: Optional[Priority] = None
    client_id: Optional[int] = None
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None


class OrderAnalytics(BaseModel):
    """Schema for order analytics"""
    total_orders: int
    active_orders: int
    completed_orders: int
    cancelled_orders: int
    average_order_value: float
    orders_by_status: Dict[str, int]
    orders_by_technology: Dict[str, int]
    orders_by_month: Dict[str, int] 
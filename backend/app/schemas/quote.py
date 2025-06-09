from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal


class QuoteBase(BaseModel):
    order_id: int
    price: Decimal = Field(..., gt=0)
    currency: str = "USD"
    delivery_days: int = Field(..., gt=0)
    description: str
    includes_shipping: bool = True
    payment_terms: Optional[str] = None
    notes: Optional[str] = None


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


class QuoteResponse(QuoteBase):
    id: int
    manufacturer_id: int
    status: str
    valid_until: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    
    class Config:
        from_attributes = True


class QuoteWithOrder(QuoteResponse):
    order_title: str
    order_status: str
    client_name: str 
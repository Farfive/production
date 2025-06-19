from pydantic import BaseModel, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal
from enum import Enum


class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    SENT = "sent"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


class InvoiceItemCreate(BaseModel):
    description: str
    quantity: int
    unit_price: Decimal
    discount_percent: Optional[float] = 0.0
    
    @validator('quantity', pre=True)
    def validate_quantity(cls, v):
        if v <= 0:
            raise ValueError('Quantity must be positive')
        return v
    
    @validator('unit_price', pre=True)
    def validate_unit_price(cls, v):
        if v < 0:
            raise ValueError('Unit price cannot be negative')
        return v


class InvoiceItemResponse(InvoiceItemCreate):
    id: int
    total_amount: Decimal
    
    class Config:
        from_attributes = True


class InvoiceCreate(BaseModel):
    quote_id: Optional[int] = None
    order_id: Optional[int] = None
    client_id: int
    items: List[InvoiceItemCreate]
    due_date: Optional[datetime] = None
    notes: Optional[str] = None
    tax_rate: Optional[float] = 0.23  # Default VAT rate
    discount_percent: Optional[float] = 0.0
    payment_terms: Optional[str] = "Net 30"


class InvoiceUpdate(BaseModel):
    items: Optional[List[InvoiceItemCreate]] = None
    due_date: Optional[datetime] = None
    notes: Optional[str] = None
    tax_rate: Optional[float] = None
    discount_percent: Optional[float] = None
    payment_terms: Optional[str] = None
    status: Optional[InvoiceStatus] = None


class InvoiceResponse(BaseModel):
    id: int
    invoice_number: str
    quote_id: Optional[int]
    order_id: Optional[int]
    client_id: int
    items: List[InvoiceItemResponse]
    subtotal: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    due_date: Optional[datetime]
    notes: Optional[str]
    status: InvoiceStatus
    payment_terms: str
    created_at: datetime
    updated_at: datetime
    sent_at: Optional[datetime]
    paid_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class InvoiceListResponse(BaseModel):
    invoices: List[InvoiceResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class InvoiceSendRequest(BaseModel):
    email_subject: Optional[str] = None
    email_message: Optional[str] = None
    send_copy_to_self: bool = True 
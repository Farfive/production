from pydantic import BaseModel, Field
from typing import Optional, Any, Dict
from datetime import datetime

class QuoteTemplateBase(BaseModel):
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    template_data: Dict[str, Any]
    is_public: bool = False

class QuoteTemplateCreate(QuoteTemplateBase):
    pass

class QuoteTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    template_data: Optional[Dict[str, Any]] = None
    is_public: Optional[bool] = None

class QuoteTemplateResponse(QuoteTemplateBase):
    id: int
    manufacturer_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True 
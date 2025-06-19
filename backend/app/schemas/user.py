from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    CLIENT = "client"
    MANUFACTURER = "manufacturer"
    ADMIN = "admin"


class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    company_name: Optional[str] = None
    nip: Optional[str] = None
    company_address: Optional[str] = None
    phone: Optional[str] = None


class UserCreate(UserBase):
    password: str
    role: UserRole
    data_processing_consent: bool = True
    marketing_consent: bool = False


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    company_name: Optional[str] = None
    nip: Optional[str] = None
    company_address: Optional[str] = None
    phone: Optional[str] = None
    marketing_consent: Optional[bool] = None


class UserResponse(UserBase):
    id: int
    role: UserRole
    registration_status: str
    is_active: bool
    email_verified: bool
    data_processing_consent: bool
    marketing_consent: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class UserInDB(UserResponse):
    password_hash: str


class UserSettings(BaseModel):
    """User settings schema"""
    email_notifications: bool = True
    sms_notifications: bool = False
    browser_notifications: bool = True
    marketing_emails: bool = False
    language: str = "en"
    timezone: str = "UTC"
    currency: str = "PLN"
    theme: str = "light"  # light, dark
    dashboard_layout: str = "default"  # default, compact, detailed
    items_per_page: int = 20
    auto_refresh: bool = True
    show_tutorials: bool = True


class UserSettingsUpdate(BaseModel):
    """User settings update schema - all fields optional"""
    email_notifications: Optional[bool] = None
    sms_notifications: Optional[bool] = None
    browser_notifications: Optional[bool] = None
    marketing_emails: Optional[bool] = None
    language: Optional[str] = None
    timezone: Optional[str] = None
    currency: Optional[str] = None
    theme: Optional[str] = None
    dashboard_layout: Optional[str] = None
    items_per_page: Optional[int] = None
    auto_refresh: Optional[bool] = None
    show_tutorials: Optional[bool] = None
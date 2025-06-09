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
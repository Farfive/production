from pydantic import BaseModel, EmailStr, field_validator, Field, validator
from typing import Optional, List
from datetime import datetime
from app.models.user import UserRole, RegistrationStatus


def validate_password_strength(v):
    """Validate password meets security requirements."""
    from app.core.security import PasswordValidator
    
    if v:  # Only validate if password is provided
        is_valid, errors = PasswordValidator.validate_password_strength(v)
        if not is_valid:
            # Join all errors into a single message for better user experience
            error_message = '; '.join(errors)
            raise ValueError(f"Password validation failed: {error_message}")
    return v


class UserBase(BaseModel):
    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    role: UserRole
    phone: Optional[str] = None
    company_name: Optional[str] = None
    nip: Optional[str] = None
    company_address: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    data_processing_consent: bool = Field(..., description="Required consent for data processing")
    marketing_consent: bool = Field(default=False, description="Optional consent for marketing")
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        if not any(c in '!@#$%^&*(),.?":{}|<>' for c in v):
            raise ValueError('Password must contain at least one special character')
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    remember_me: Optional[bool] = False


class UserResponse(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    role: UserRole
    registration_status: RegistrationStatus
    is_active: bool
    email_verified: bool
    phone: Optional[str] = None
    company_name: Optional[str] = None
    nip: Optional[str] = None
    company_address: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None
    firebase_uid: Optional[str] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordReset(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)
    
    @validator('new_password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        if not any(c in '!@#$%^&*(),.?":{}|<>' for c in v):
            raise ValueError('Password must contain at least one special character')
        return v


class EmailVerification(BaseModel):
    token: str


class ResendEmailVerification(BaseModel):
    """Resend email verification schema."""
    email: EmailStr = Field(..., description="Email address to resend verification")


class ChangePassword(BaseModel):
    """Change password schema."""
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=8, description="New password")
    
    @field_validator('new_password')
    @classmethod
    def validate_new_password(cls, v):
        return validate_password_strength(v)


class UserUpdate(BaseModel):
    """Update user profile schema."""
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    company_name: Optional[str] = Field(None, max_length=255)
    nip: Optional[str] = Field(None, max_length=20)
    phone: Optional[str] = Field(None, max_length=20)
    company_address: Optional[str] = Field(None)
    marketing_consent: Optional[bool] = Field(None)
    
    @field_validator('nip')
    @classmethod
    def validate_nip(cls, v):
        """Validate Polish NIP format."""
        if v:
            nip_digits = ''.join(filter(str.isdigit, v))
            if len(nip_digits) != 10:
                raise ValueError('NIP must contain exactly 10 digits')
            return nip_digits
        return v


class AccountDeactivation(BaseModel):
    """Account deactivation schema."""
    password: str = Field(..., description="Current password for confirmation")
    reason: Optional[str] = Field(None, max_length=500, description="Reason for deactivation")


class GDPRDataExport(BaseModel):
    """GDPR data export request schema."""
    password: str = Field(..., description="Current password for confirmation")


class GDPRDataDeletion(BaseModel):
    """GDPR data deletion request schema."""
    password: str = Field(..., description="Current password for confirmation")
    confirmation: str = Field(..., description="Must be 'DELETE' to confirm")
    
    @field_validator('confirmation')
    @classmethod
    def validate_confirmation(cls, v):
        if v != "DELETE":
            raise ValueError('Must type "DELETE" to confirm account deletion')
        return v


class AuthErrorResponse(BaseModel):
    """Authentication error response schema."""
    detail: str = Field(..., description="Error message")
    error_code: Optional[str] = Field(None, description="Specific error code")
    retry_after: Optional[int] = Field(None, description="Retry after seconds")


class PasswordStrengthCheck(BaseModel):
    """Password strength check request schema."""
    password: str = Field(..., description="Password to check")


class PasswordStrengthResponse(BaseModel):
    """Password strength check response schema."""
    is_strong: bool = Field(..., description="Whether password meets requirements")
    errors: List[str] = Field(..., description="List of validation errors")
    suggestions: List[str] = Field(..., description="List of improvement suggestions")


class SuccessResponse(BaseModel):
    """Generic success response schema."""
    message: str = Field(..., description="Success message")
    data: Optional[dict] = Field(None, description="Additional response data")


class UserListResponse(BaseModel):
    """User list response schema (for admin endpoints)."""
    users: List[UserResponse]
    total: int
    page: int
    per_page: int


class LoginAttempt(BaseModel):
    """Login attempt tracking schema."""
    email: str
    ip_address: str
    user_agent: str
    success: bool
    attempted_at: datetime
    failure_reason: Optional[str] = None


class TwoFactorSetup(BaseModel):
    """Two-factor authentication setup schema."""
    secret: str = Field(..., description="TOTP secret")
    qr_code: str = Field(..., description="QR code data URL")
    backup_codes: List[str] = Field(..., description="Backup codes")


class TwoFactorVerification(BaseModel):
    """Two-factor authentication verification schema."""
    code: str = Field(..., min_length=6, max_length=6, description="TOTP code")


class SessionInfo(BaseModel):
    """User session information schema."""
    id: str
    user_id: int
    ip_address: str
    user_agent: str
    created_at: datetime
    last_activity: datetime
    is_current: bool


# Firebase Authentication Schemas
class FirebaseUserSync(BaseModel):
    """Schema for syncing Firebase user with backend"""
    firebase_uid: Optional[str] = None
    email: Optional[str] = None
    display_name: Optional[str] = None
    email_verified: Optional[bool] = None
    photo_url: Optional[str] = None
    phone_number: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[str] = None
    company_name: Optional[str] = None
    nip: Optional[str] = None
    company_address: Optional[str] = None


class FirebaseTokenVerify(BaseModel):
    """Schema for Firebase token verification"""
    token: str = Field(..., description="Firebase ID token")


class FirebaseCustomClaims(BaseModel):
    """Schema for Firebase custom claims"""
    role: str
    user_id: int
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    company_name: Optional[str] = None
    nip: Optional[str] = None
    company_address: Optional[str] = None
    registration_completed: bool = True


class FirebaseAuthResponse(BaseModel):
    """Schema for Firebase authentication response"""
    success: bool
    firebase_user: dict
    synced: bool
    user: Optional[UserResponse] = None
    custom_claims: Optional[FirebaseCustomClaims] = None 
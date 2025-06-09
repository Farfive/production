from pydantic import BaseModel, EmailStr, field_validator, Field
from typing import Optional, List
from datetime import datetime
from app.models.user import UserRole, RegistrationStatus


def validate_password_strength(v):
    """Validate password meets security requirements."""
    from app.core.security import PasswordValidator
    
    if v:  # Only validate if password is provided
        is_valid, errors = PasswordValidator.validate_password_strength(v)
        if not is_valid:
            raise ValueError(f"Password validation failed: {'; '.join(errors)}")
    return v


class UserLogin(BaseModel):
    """User login request schema."""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=1, description="User password")
    remember_me: bool = Field(default=False, description="Extend token lifetime")


class UserCreate(BaseModel):
    """User registration request schema."""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, description="User password")
    first_name: str = Field(..., min_length=1, max_length=100, description="First name")
    last_name: str = Field(..., min_length=1, max_length=100, description="Last name")
    role: UserRole = Field(..., description="User role")
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        return validate_password_strength(v)
    
    # Company information (optional during registration)
    company_name: Optional[str] = Field(None, max_length=255, description="Company name")
    nip: Optional[str] = Field(None, max_length=20, description="Tax identification number")
    phone: Optional[str] = Field(None, max_length=20, description="Phone number")
    company_address: Optional[str] = Field(None, description="Company address")
    
    # GDPR compliance
    data_processing_consent: bool = Field(..., description="Consent to data processing")
    marketing_consent: bool = Field(default=False, description="Consent to marketing communications")
    
    @field_validator('email')
    @classmethod
    def validate_email_format(cls, v):
        """Additional email validation."""
        if not v or '@' not in v:
            raise ValueError('Invalid email format')
        return v.lower()
    
    @field_validator('nip')
    @classmethod
    def validate_nip(cls, v):
        """Validate Polish NIP format."""
        if v:
            # Remove any non-digit characters
            nip_digits = ''.join(filter(str.isdigit, v))
            if len(nip_digits) != 10:
                raise ValueError('NIP must contain exactly 10 digits')
            return nip_digits
        return v


class UserResponse(BaseModel):
    """User profile response schema."""
    id: int
    email: str
    first_name: str
    last_name: str
    company_name: Optional[str]
    nip: Optional[str]
    phone: Optional[str]
    company_address: Optional[str]
    role: UserRole
    registration_status: RegistrationStatus
    is_active: bool
    email_verified: bool
    data_processing_consent: bool
    marketing_consent: bool
    created_at: datetime
    last_login: Optional[datetime]
    
    model_config = {"from_attributes": True}


class Token(BaseModel):
    """Authentication token response schema."""
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Access token expiration time in seconds")
    user: UserResponse = Field(..., description="User profile information")


class RefreshTokenRequest(BaseModel):
    """Refresh token request schema."""
    refresh_token: str = Field(..., description="Valid refresh token")


class RefreshTokenResponse(BaseModel):
    """Refresh token response schema."""
    access_token: str = Field(..., description="New JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiration time in seconds")


class PasswordResetRequest(BaseModel):
    """Password reset request schema."""
    email: EmailStr = Field(..., description="Email address for password reset")


class PasswordReset(BaseModel):
    """Password reset with token schema."""
    token: str = Field(..., description="Password reset token")
    new_password: str = Field(..., min_length=8, description="New password")
    
    @field_validator('new_password')
    @classmethod
    def validate_new_password(cls, v):
        return validate_password_strength(v)


class EmailVerification(BaseModel):
    """Email verification schema."""
    token: str = Field(..., description="Email verification token")


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
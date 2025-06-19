"""
Advanced Security Core Module
Implements enterprise-grade security controls for the manufacturing platform
"""

import hashlib
import secrets
import hmac
import jwt
from jwt.exceptions import InvalidTokenError as JWTError
import bcrypt
import pyotp
import qrcode
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any, Tuple, Union
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend
from passlib.context import CryptContext
from pydantic import BaseModel
import base64
import os
import json
import time
import ipaddress
from email_validator import validate_email, EmailNotValidError
import re
from urllib.parse import urljoin

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session, joinedload
import logging

from app.core.config import get_settings
from app.core.database import get_db
from app.models.user import User, UserRole, RegistrationStatus

settings = get_settings()

# Initialize logger
logger = logging.getLogger(__name__)

# HTTP Bearer security instance
security = HTTPBearer()

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security constants
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7
PASSWORD_MIN_LENGTH = 12
PASSWORD_MAX_LENGTH = 128
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 30
SESSION_TIMEOUT_MINUTES = 60
MFA_SECRET_LENGTH = 32
API_KEY_LENGTH = 64

class SecurityConfig:
    """Security configuration and constants"""
    
    # Password complexity requirements
    PASSWORD_PATTERNS = {
        'uppercase': r'[A-Z]',
        'lowercase': r'[a-z]',
        'digits': r'\d',
        'special': r'[!@#$%^&*(),.?":{}|<>]'
    }
    
    # Rate limiting settings
    RATE_LIMITS = {
        'login': {'requests': 5, 'window': 300},  # 5 attempts per 5 minutes
        'api': {'requests': 1000, 'window': 3600},  # 1000 requests per hour
        'password_reset': {'requests': 3, 'window': 3600},  # 3 resets per hour
    }
    
    # Security headers
    SECURITY_HEADERS = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'",
        'Referrer-Policy': 'strict-origin-when-cross-origin'
    }

class SecurityModels:
    """Security-related Pydantic models"""
    
    class TokenData(BaseModel):
        username: Optional[str] = None
        user_id: Optional[int] = None
        scopes: List[str] = []
        
    class LoginAttempt(BaseModel):
        ip_address: str
        user_agent: str
        timestamp: datetime
        success: bool
        failure_reason: Optional[str] = None
        
    class SecurityEvent(BaseModel):
        event_type: str
        user_id: Optional[int] = None
        ip_address: str
        timestamp: datetime
        details: Dict[str, Any]
        risk_level: str  # LOW, MEDIUM, HIGH, CRITICAL
        
    class MFASetup(BaseModel):
        secret: str
        qr_code: str
        backup_codes: List[str]

class PasswordSecurity:
    """Advanced password security implementation"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using bcrypt with random salt"""
        # Use PasswordValidator for proper validation
        is_valid, errors = PasswordValidator.validate_password_strength(password)
        if not is_valid:
            raise ValueError(f"Password does not meet security requirements: {', '.join(errors)}")
        
        salt = bcrypt.gensalt(rounds=12)
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        try:
            return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
        except (ValueError, TypeError):
            return False
    
    @staticmethod
    def validate_password_strength(password: str) -> bool:
        """Validate password meets security requirements"""
        if len(password) < PASSWORD_MIN_LENGTH or len(password) > PASSWORD_MAX_LENGTH:
            return False
        
        # Check for required character types
        for pattern_name, pattern in SecurityConfig.PASSWORD_PATTERNS.items():
            if not re.search(pattern, password):
                return False
        
        # Check for common weak patterns
        weak_patterns = [
            r'(.)\1{3,}',  # 4+ consecutive same characters
            r'(012|123|234|345|456|567|678|789|890)',  # Sequential numbers
            r'(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)',  # Sequential letters
        ]
        
        for weak_pattern in weak_patterns:
            if re.search(weak_pattern, password.lower()):
                return False
        
        return True
    
    @staticmethod
    def generate_secure_password(length: int = 16) -> str:
        """Generate a cryptographically secure password"""
        alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
        return ''.join(secrets.choice(alphabet) for _ in range(length))

class TokenSecurity:
    """JWT token security implementation"""
    
    @staticmethod
    def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """Create a JWT access token"""
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "access",
            "jti": secrets.token_urlsafe(32)  # JWT ID for revocation
        })
        
        return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    
    @staticmethod
    def create_refresh_token(user_id: int) -> str:
        """Create a JWT refresh token"""
        to_encode = {
            "user_id": user_id,
            "exp": datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
            "iat": datetime.utcnow(),
            "type": "refresh",
            "jti": secrets.token_urlsafe(32)
        }
        
        return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    
    @staticmethod
    def verify_token(token: str, token_type: str = "access") -> Optional[Dict[str, Any]]:
        """Verify and decode a JWT token"""
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
            
            if payload.get("type") != token_type:
                return None
            
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.JWTError:
            return None
    
    @staticmethod
    def extract_token_from_header(authorization: str) -> Optional[str]:
        """Extract token from Authorization header"""
        if not authorization:
            return None
        
        try:
            scheme, token = authorization.split()
            if scheme.lower() != "bearer":
                return None
            return token
        except ValueError:
            return None

class EncryptionSecurity:
    """Data encryption and decryption utilities"""
    
    def __init__(self):
        self.key = self._get_or_create_key()
        self.cipher = Fernet(self.key)
    
    def _get_or_create_key(self) -> bytes:
        """Get or create encryption key"""
        key_path = "encryption.key"
        
        if os.path.exists(key_path):
            with open(key_path, "rb") as key_file:
                return key_file.read()
        else:
            key = Fernet.generate_key()
            with open(key_path, "wb") as key_file:
                key_file.write(key)
            return key
    
    def encrypt(self, data: str) -> str:
        """Encrypt data"""
        encrypted_data = self.cipher.encrypt(data.encode())
        return base64.urlsafe_b64encode(encrypted_data).decode()
    
    def decrypt(self, encrypted_data: str) -> str:
        """Decrypt data"""
        try:
            encrypted_bytes = base64.urlsafe_b64decode(encrypted_data.encode())
            decrypted_data = self.cipher.decrypt(encrypted_bytes)
            return decrypted_data.decode()
        except Exception:
            raise ValueError("Failed to decrypt data")
    
    def encrypt_dict(self, data: Dict[str, Any]) -> str:
        """Encrypt a dictionary as JSON"""
        json_data = json.dumps(data)
        return self.encrypt(json_data)
    
    def decrypt_dict(self, encrypted_data: str) -> Dict[str, Any]:
        """Decrypt data back to dictionary"""
        json_data = self.decrypt(encrypted_data)
        return json.loads(json_data)

class MFASecurity:
    """Multi-Factor Authentication implementation"""
    
    @staticmethod
    def generate_secret() -> str:
        """Generate a new TOTP secret"""
        return pyotp.random_base32()
    
    @staticmethod
    def generate_qr_code(secret: str, user_email: str, issuer: str = "Manufacturing Platform") -> str:
        """Generate QR code for TOTP setup"""
        totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=user_email,
            issuer_name=issuer
        )
        
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(totp_uri)
        qr.make(fit=True)
        
        # Convert to base64 string for frontend display
        from io import BytesIO
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        import base64
        img_str = base64.b64encode(buffer.getvalue()).decode()
        return f"data:image/png;base64,{img_str}"
    
    @staticmethod
    def verify_totp(secret: str, token: str) -> bool:
        """Verify TOTP token"""
        totp = pyotp.TOTP(secret)
        return totp.verify(token, valid_window=1)  # Allow 1 time step tolerance
    
    @staticmethod
    def generate_backup_codes(count: int = 8) -> List[str]:
        """Generate backup codes for MFA"""
        return [secrets.token_hex(4).upper() for _ in range(count)]

class SecurityAuditLogger:
    """Security event logging and monitoring"""
    
    def __init__(self):
        self.encryption = EncryptionSecurity()
    
    def log_security_event(self, event: SecurityModels.SecurityEvent) -> None:
        """Log a security event"""
        # In production, this would send to SIEM/logging system
        log_entry = {
            "timestamp": event.timestamp.isoformat(),
            "event_type": event.event_type,
            "user_id": event.user_id,
            "ip_address": event.ip_address,
            "details": event.details,
            "risk_level": event.risk_level
        }
        
        # Encrypt sensitive details
        if event.details:
            log_entry["details"] = self.encryption.encrypt_dict(event.details)
        
        print(f"SECURITY EVENT: {json.dumps(log_entry, indent=2)}")
    
    def log_login_attempt(self, attempt: SecurityModels.LoginAttempt) -> None:
        """Log a login attempt"""
        event = SecurityModels.SecurityEvent(
            event_type="LOGIN_ATTEMPT",
            ip_address=attempt.ip_address,
            timestamp=attempt.timestamp,
            details={
                "user_agent": attempt.user_agent,
                "success": attempt.success,
                "failure_reason": attempt.failure_reason
            },
            risk_level="LOW" if attempt.success else "MEDIUM"
        )
        self.log_security_event(event)

class RateLimiter:
    """Rate limiting implementation"""
    
    def __init__(self):
        self.attempts = {}
    
    def is_rate_limited(self, identifier: str, limit_type: str) -> bool:
        """Check if identifier is rate limited"""
        limit_config = SecurityConfig.RATE_LIMITS.get(limit_type, {})
        max_requests = limit_config.get('requests', 100)
        window = limit_config.get('window', 3600)
        
        current_time = time.time()
        
        if identifier not in self.attempts:
            self.attempts[identifier] = []
        
        # Clean old attempts
        self.attempts[identifier] = [
            attempt_time for attempt_time in self.attempts[identifier]
            if current_time - attempt_time < window
        ]
        
        # Check if limit exceeded
        if len(self.attempts[identifier]) >= max_requests:
            return True
        
        # Record this attempt
        self.attempts[identifier].append(current_time)
        return False

class InputSanitizer:
    """Input validation and sanitization"""
    
    @staticmethod
    def sanitize_email(email: str) -> str:
        """Validate and sanitize email address"""
        try:
            validated = validate_email(email)
            return validated.email.lower()
        except EmailNotValidError:
            raise ValueError("Invalid email address")
    
    @staticmethod
    def sanitize_string(input_str: str, max_length: int = 1000) -> str:
        """Sanitize string input"""
        if not isinstance(input_str, str):
            raise ValueError("Input must be a string")
        
        # Remove null bytes and control characters
        sanitized = ''.join(char for char in input_str if ord(char) >= 32 or char in '\n\r\t')
        
        # Limit length
        if len(sanitized) > max_length:
            raise ValueError(f"Input too long (max {max_length} characters)")
        
        return sanitized.strip()
    
    @staticmethod
    def validate_ip_address(ip: str) -> bool:
        """Validate IP address"""
        try:
            ipaddress.ip_address(ip)
            return True
        except ValueError:
            return False

class SecurityHeaders:
    """Security headers management"""
    
    @staticmethod
    def get_security_headers() -> Dict[str, str]:
        """Get security headers for responses"""
        return SecurityConfig.SECURITY_HEADERS.copy()
    
    @staticmethod
    def apply_headers(response, headers: Optional[Dict[str, str]] = None):
        """Apply security headers to response"""
        headers_to_apply = headers or SecurityHeaders.get_security_headers()
        
        for header_name, header_value in headers_to_apply.items():
            response.headers[header_name] = header_value
        
        return response

# Global instances
encryption_service = EncryptionSecurity()
audit_logger = SecurityAuditLogger()
rate_limiter = RateLimiter()

# Utility functions
def get_password_hash(password: str) -> str:
    """Get password hash"""
    return PasswordSecurity.hash_password(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password"""
    return PasswordSecurity.verify_password(plain_password, hashed_password)

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create access token"""
    return TokenSecurity.create_access_token(data, expires_delta)

def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify token"""
    return TokenSecurity.verify_token(token)

def generate_api_key() -> str:
    """Generate secure API key"""
    return secrets.token_urlsafe(API_KEY_LENGTH)

def hash_api_key(api_key: str) -> str:
    """Hash API key for storage"""
    return hashlib.sha256(api_key.encode()).hexdigest()

def verify_api_key(api_key: str, hashed_key: str) -> bool:
    """Verify API key against hash"""
    return hmac.compare_digest(hash_api_key(api_key), hashed_key)

# Token types
TOKEN_TYPE_ACCESS = "access"
TOKEN_TYPE_REFRESH = "refresh"
TOKEN_TYPE_EMAIL_VERIFICATION = "email_verification"
TOKEN_TYPE_PASSWORD_RESET = "password_reset"


class SecurityException(Exception):
    """Custom security exception."""
    pass


class TokenManager:
    """Centralized token management for JWT operations."""
    
    @staticmethod
    def create_access_token(
        subject: Union[str, Any], 
        expires_delta: Optional[timedelta] = None,
        additional_claims: Optional[Dict[str, Any]] = None
    ) -> str:
        """Create a JWT access token with 15-minute expiry."""
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=15)
        
        to_encode = {
            "exp": expire,
            "iat": datetime.utcnow(),
            "sub": str(subject),
            "type": TOKEN_TYPE_ACCESS
        }
        
        if additional_claims:
            to_encode.update(additional_claims)
        
        try:
            encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.ALGORITHM)
            logger.info(f"Access token created for subject: {subject}")
            return encoded_jwt
        except Exception as e:
            logger.error(f"Error creating access token: {e}")
            raise SecurityException("Failed to create access token")
    
    @staticmethod
    def create_refresh_token(
        subject: Union[str, Any],
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create a JWT refresh token with 7-day expiry."""
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(days=7)
        
        to_encode = {
            "exp": expire,
            "iat": datetime.utcnow(),
            "sub": str(subject),
            "type": TOKEN_TYPE_REFRESH,
            "jti": secrets.token_urlsafe(32)  # Unique token ID for revocation
        }
        
        try:
            encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.ALGORITHM)
            logger.info(f"Refresh token created for subject: {subject}")
            return encoded_jwt
        except Exception as e:
            logger.error(f"Error creating refresh token: {e}")
            raise SecurityException("Failed to create refresh token")
    
    @staticmethod
    def create_email_verification_token(email: str) -> str:
        """Create a secure email verification token."""
        expire = datetime.utcnow() + timedelta(hours=24)
        
        to_encode = {
            "exp": expire,
            "iat": datetime.utcnow(),
            "email": email,
            "type": TOKEN_TYPE_EMAIL_VERIFICATION,
            "jti": secrets.token_urlsafe(32)
        }
        
        try:
            encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.ALGORITHM)
            logger.info(f"Email verification token created for: {email}")
            return encoded_jwt
        except Exception as e:
            logger.error(f"Error creating email verification token: {e}")
            raise SecurityException("Failed to create email verification token")
    
    @staticmethod
    def create_password_reset_token(email: str) -> str:
        """Create a secure password reset token."""
        expire = datetime.utcnow() + timedelta(hours=1)
        
        to_encode = {
            "exp": expire,
            "iat": datetime.utcnow(),
            "email": email,
            "type": TOKEN_TYPE_PASSWORD_RESET,
            "jti": secrets.token_urlsafe(32)
        }
        
        try:
            encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.ALGORITHM)
            logger.info(f"Password reset token created for: {email}")
            return encoded_jwt
        except Exception as e:
            logger.error(f"Error creating password reset token: {e}")
            raise SecurityException("Failed to create password reset token")
    
    @staticmethod
    def verify_token(token: str, expected_type: str) -> Optional[Dict[str, Any]]:
        """Verify and decode a JWT token."""
        try:
            payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.ALGORITHM])
            
            # Verify token type
            if payload.get("type") != expected_type:
                logger.warning(f"Invalid token type. Expected: {expected_type}, Got: {payload.get('type')}")
                return None
            
            # Check expiration
            exp = payload.get("exp")
            if exp and datetime.utcfromtimestamp(exp) < datetime.utcnow():
                logger.warning("Token has expired")
                return None
            
            return payload
            
        except JWTError as e:
            logger.warning(f"JWT verification failed: {e}")
            return None
        except Exception as e:
            logger.error(f"Token verification error: {e}")
            return None


class PasswordValidator:
    """Password complexity validation."""
    
    @staticmethod
    def validate_password_strength(password: str) -> tuple[bool, List[str]]:
        """
        Validate password meets security requirements.
        
        Requirements:
        - Minimum 8 characters
        - At least one uppercase letter
        - At least one lowercase letter
        - At least one digit
        - At least one special character
        - No common passwords
        """
        errors = []
        
        if len(password) < 8:
            errors.append("Password must be at least 8 characters long")
        
        if not re.search(r"[A-Z]", password):
            errors.append("Password must contain at least one uppercase letter")
        
        if not re.search(r"[a-z]", password):
            errors.append("Password must contain at least one lowercase letter")
        
        if not re.search(r"\d", password):
            errors.append("Password must contain at least one digit")
        
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
            errors.append("Password must contain at least one special character")
        
        # Check against common passwords
        common_passwords = [
            "password", "123456", "password123", "admin", "qwerty",
            "letmein", "welcome", "monkey", "dragon", "master"
        ]
        
        if password.lower() in common_passwords:
            errors.append("Password is too common and easily guessable")
        
        return len(errors) == 0, errors


def verify_email_verification_token(token: str) -> Optional[str]:
    """Verify email verification token and return email."""
    payload = TokenManager.verify_token(token, TOKEN_TYPE_EMAIL_VERIFICATION)
    return payload.get("email") if payload else None


def verify_password_reset_token(token: str) -> Optional[str]:
    """Verify password reset token and return email."""
    payload = TokenManager.verify_token(token, TOKEN_TYPE_PASSWORD_RESET)
    return payload.get("email") if payload else None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Get current user from JWT token.
    Decodes the token, validates it, and fetches the user from the database.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = TokenManager.verify_token(credentials.credentials, TOKEN_TYPE_ACCESS)
    if payload is None:
        raise credentials_exception
        
    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    try:
        user_id = int(user_id)
    except (ValueError, TypeError):
        raise credentials_exception
    
    # Eagerly load manufacturer_profile to prevent separate queries later
    user = db.query(User).options(joinedload(User.manufacturer_profile)).filter(User.id == user_id).first()
    
    if user is None:
        logger.warning(f"User with ID {user_id} not found from token.")
        raise credentials_exception
    
    logger.info(f"User {user.email} authenticated successfully.")
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current active user with email verification check."""
    if current_user.registration_status != RegistrationStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account"
        )
    
    if not current_user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email not verified"
        )
    
    return current_user


async def get_current_verified_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current user (allows unverified email for verification endpoints)."""
    if current_user.registration_status == RegistrationStatus.SUSPENDED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account suspended"
        )
    
    return current_user


def require_role(required_roles: Union[UserRole, List[UserRole]]):
    """Decorator to require specific user role(s)."""
    if isinstance(required_roles, UserRole):
        required_roles = [required_roles]
    
    def role_checker(current_user: User = Depends(get_current_active_user)):
        if current_user.role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user
    return role_checker


def require_admin():
    """Require admin role."""
    return require_role(UserRole.ADMIN)


def require_client():
    """Require client role."""
    return require_role(UserRole.CLIENT)


def require_manufacturer():
    """Require manufacturer role."""
    return require_role(UserRole.MANUFACTURER)


def require_client_or_manufacturer():
    """Require client or manufacturer role."""
    return require_role([UserRole.CLIENT, UserRole.MANUFACTURER])


# Role-specific dependencies
get_current_admin = Depends(require_admin())
get_current_client = Depends(require_client())
get_current_manufacturer = Depends(require_manufacturer())
get_current_user_any_role = Depends(require_client_or_manufacturer())


# Optional authentication dependency for testing
async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Get current user from JWT token, but allow None if no token provided.
    This is useful for endpoints that should work both authenticated and unauthenticated.
    """
    if not credentials:
        return None
        
    try:
        payload = TokenManager.verify_token(credentials.credentials, TOKEN_TYPE_ACCESS)
        if payload is None:
            return None
            
        user_id = payload.get("sub")
        if user_id is None:
            return None

        try:
            user_id = int(user_id)
        except (ValueError, TypeError):
            return None
        
        user = db.query(User).filter(User.id == user_id).first()
        if user is None:
            logger.warning(f"User with ID {user_id} not found from token.")
            return None
        
        logger.info(f"User {user.email} authenticated successfully.")
        return user
    except Exception as e:
        logger.warning(f"Optional authentication failed: {e}")
        return None


# Standalone functions for backward compatibility
def create_access_token(
    subject: Union[str, Any], 
    expires_delta: Optional[timedelta] = None,
    additional_claims: Optional[Dict[str, Any]] = None
) -> str:
    """Create a JWT access token (standalone function)."""
    return TokenManager.create_access_token(subject, expires_delta, additional_claims)


def create_refresh_token(
    subject: Union[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create a JWT refresh token (standalone function)."""
    return TokenManager.create_refresh_token(subject, expires_delta)


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and verify a JWT token (standalone function)."""
    return TokenManager.verify_token(token, TOKEN_TYPE_ACCESS) 
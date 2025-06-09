from datetime import datetime, timedelta, timezone
from typing import Any, Union, Optional, Dict, List
import secrets
import re
import logging
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.core.config import get_settings
from app.core.database import get_db
from app.models.user import User, UserRole, RegistrationStatus

settings = get_settings()
logger = logging.getLogger(__name__)

# Password context with bcrypt (12 rounds minimum for production security)
pwd_context = CryptContext(
    schemes=["bcrypt"], 
    deprecated="auto",
    bcrypt__rounds=12
)

# JWT token scheme
security = HTTPBearer()

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
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=15)
        
        to_encode = {
            "exp": expire,
            "iat": datetime.now(timezone.utc),
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
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(days=7)
        
        to_encode = {
            "exp": expire,
            "iat": datetime.now(timezone.utc),
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
        expire = datetime.now(timezone.utc) + timedelta(hours=24)
        
        to_encode = {
            "exp": expire,
            "iat": datetime.now(timezone.utc),
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
        expire = datetime.now(timezone.utc) + timedelta(hours=1)
        
        to_encode = {
            "exp": expire,
            "iat": datetime.now(timezone.utc),
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
            if exp and datetime.fromtimestamp(exp, tz=timezone.utc) < datetime.now(timezone.utc):
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


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False


def get_password_hash(password: str) -> str:
    """Generate password hash with bcrypt (12 rounds)."""
    try:
        return pwd_context.hash(password)
    except Exception as e:
        logger.error(f"Password hashing error: {e}")
        raise SecurityException("Failed to hash password")


def generate_secure_token() -> str:
    """Generate a cryptographically secure random token."""
    return secrets.token_urlsafe(32)


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
    """Get current authenticated user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = TokenManager.verify_token(credentials.credentials, TOKEN_TYPE_ACCESS)
        if not payload:
            raise credentials_exception
            
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
            
    except Exception:
        raise credentials_exception
    
    user = db.query(User).filter(
        and_(
            User.id == int(user_id),
            User.is_active == True
        )
    ).first()
    
    if user is None:
        raise credentials_exception
    
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
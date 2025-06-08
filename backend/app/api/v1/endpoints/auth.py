from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    verify_password,
    get_current_user,
    get_current_active_user
)
from app.models.user import User, UserRole, RegistrationStatus
from app.services.email import send_verification_email
from app.schemas.auth import (
    UserCreate,
    UserLogin,
    Token,
    UserResponse,
    PasswordReset,
    PasswordResetRequest
)
from loguru import logger

router = APIRouter()


@router.post("/register", response_model=UserResponse)
async def register(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    """Register a new user"""
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        email=user_data.email,
        password_hash=hashed_password,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        role=user_data.role,
        registration_status=RegistrationStatus.PENDING_EMAIL_VERIFICATION
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Send verification email
    try:
        await send_verification_email(db_user.email, db_user.first_name)
        logger.info(f"Verification email sent to {db_user.email}")
    except Exception as e:
        logger.error(f"Failed to send verification email: {e}")
    
    return UserResponse.from_orm(db_user)


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Login user and return JWT tokens"""
    user = db.query(User).filter(User.email == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    # Update last login
    from datetime import datetime
    user.last_login = datetime.now()
    db.commit()
    
    # Create tokens
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=user.id, expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(subject=user.id)
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserResponse.from_orm(user)
    )


@router.post("/refresh", response_model=Token)
async def refresh_token(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Refresh access token"""
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=current_user.id, expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(subject=current_user.id)
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserResponse.from_orm(current_user)
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
):
    """Get current user information"""
    return UserResponse.from_orm(current_user)


@router.post("/password-reset-request")
async def request_password_reset(
    request: PasswordResetRequest,
    db: Session = Depends(get_db)
):
    """Request password reset"""
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        # Don't reveal if email exists or not
        return {"message": "If the email exists, you will receive password reset instructions"}
    
    # Generate reset token
    import secrets
    import hashlib
    from datetime import datetime, timedelta
    
    reset_token = secrets.token_urlsafe(32)
    user.password_reset_token = hashlib.sha256(reset_token.encode()).hexdigest()
    user.password_reset_expires = datetime.now() + timedelta(hours=1)
    
    db.commit()
    
    # Send password reset email
    try:
        from app.services.email import send_password_reset_email
        await send_password_reset_email(user.email, user.first_name, reset_token)
        logger.info(f"Password reset email sent to {user.email}")
    except Exception as e:
        logger.error(f"Failed to send password reset email: {e}")
    
    return {"message": "If the email exists, you will receive password reset instructions"}


@router.post("/password-reset")
async def reset_password(
    reset_data: PasswordReset,
    db: Session = Depends(get_db)
):
    """Reset password using token"""
    import hashlib
    from datetime import datetime
    
    # Hash the provided token
    token_hash = hashlib.sha256(reset_data.token.encode()).hexdigest()
    
    user = db.query(User).filter(
        User.password_reset_token == token_hash,
        User.password_reset_expires > datetime.now()
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Update password
    user.password_hash = get_password_hash(reset_data.new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    
    db.commit()
    
    return {"message": "Password reset successfully"}


@router.post("/verify-email")
async def verify_email(
    token: str,
    db: Session = Depends(get_db)
):
    """Verify email address"""
    user = db.query(User).filter(User.email_verification_token == token).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification token"
        )
    
    user.email_verified = True
    user.email_verification_token = None
    user.registration_status = RegistrationStatus.ACTIVE
    
    db.commit()
    
    return {"message": "Email verified successfully"} 
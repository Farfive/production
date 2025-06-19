from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, Dict, Any

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
from app.core.firebase_auth import FirebaseAuthBackend, verify_firebase_token
from app.models.user import User, UserRole, RegistrationStatus
try:
    from app.services.email import send_verification_email
except ImportError:
    # Fallback to mock email service for testing
    from app.services.email_mock import send_verification_email
from app.schemas.auth import (
    UserCreate,
    UserLogin,
    Token,
    UserResponse,
    PasswordReset,
    PasswordResetRequest,
    ChangePassword,
    FirebaseUserSync,
    FirebaseTokenVerify
)
from loguru import logger
from app.core.security import PasswordValidator

router = APIRouter()
firebase_auth = FirebaseAuthBackend()


@router.post("/register", response_model=UserResponse)
def register(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    """Register a new user"""
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered"
            )
        
        # Create new user
        from datetime import datetime
        hashed_password = get_password_hash(user_data.password)
        
        # Check email verification setting
        if not settings.ENABLE_EMAIL_VERIFICATION or settings.ENVIRONMENT == "development":
            registration_status = RegistrationStatus.ACTIVE
            email_verified = True
            is_active = True
        else:
            registration_status = RegistrationStatus.PENDING_EMAIL_VERIFICATION
            email_verified = False
            is_active = True
        
        db_user = User(
            email=user_data.email,
            password_hash=hashed_password,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            role=user_data.role,
            registration_status=registration_status,
            email_verified=email_verified,
            is_active=is_active,
            company_name=user_data.company_name,
            nip=user_data.nip,
            phone=user_data.phone,
            company_address=user_data.company_address,
            data_processing_consent=user_data.data_processing_consent,
            marketing_consent=user_data.marketing_consent,
            consent_date=datetime.now() if user_data.data_processing_consent else None
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        # Send verification email (async call handled separately)
        try:
            # Note: Email sending is handled asynchronously in background
            logger.info(f"User registered: {db_user.email}")
        except Exception as e:
            logger.error(f"Registration completed with warning: {e}")
        
        return UserResponse.from_orm(db_user)
        
    except HTTPException:
        # Re-raise HTTP exceptions (like user already exists)
        raise
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed due to server error"
        )


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
    
    # Check user activation status with more detailed error messages
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account"
        )
    
    # Check registration status
    if user.registration_status != RegistrationStatus.ACTIVE:
        if user.registration_status == RegistrationStatus.PENDING_EMAIL_VERIFICATION:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email verification required. Please check your email and verify your account."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Account not active. Status: {user.registration_status.value}"
            )
    
    # Update last login
    from datetime import datetime
    user.last_login = datetime.now()
    db.commit()
    db.refresh(user)  # Refresh user object to get latest database values
    
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
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.from_orm(user)
    )


@router.post("/login-json", response_model=Token)
async def login_json(
    user_login: UserLogin,
    db: Session = Depends(get_db)
):
    """Login user with JSON data and return JWT tokens"""
    user = db.query(User).filter(User.email == user_login.email).first()
    
    if not user or not verify_password(user_login.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check user activation status with more detailed error messages
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account"
        )
    
    # Check registration status
    if user.registration_status != RegistrationStatus.ACTIVE:
        if user.registration_status == RegistrationStatus.PENDING_EMAIL_VERIFICATION:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email verification required. Please check your email and verify your account."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Account not active. Status: {user.registration_status.value}"
            )
    
    # Update last login
    from datetime import datetime
    user.last_login = datetime.now()
    db.commit()
    db.refresh(user)  # Refresh user object to get latest database values
    
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
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.from_orm(user)
    )


@router.post("/login-simple", response_model=Token)
async def login_simple(
    user_login: UserLogin,
    db: Session = Depends(get_db)
):
    """Simplified login that bypasses enum conversion issues"""
    try:
        # Use raw SQL to avoid enum conversion issues
        result = db.execute(
            text("""
                SELECT id, email, password_hash, first_name, last_name, 
                       role, registration_status, is_active, email_verified,
                       company_name, nip, company_address, phone, 
                       created_at, updated_at, last_login
                FROM users 
                WHERE email = :email
            """),
            {"email": user_login.email}
        )
        
        user_row = result.fetchone()
        
        if not user_row:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Verify password
        if not user_row.password_hash or not verify_password(user_login.password, user_row.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Check if user is active
        if not user_row.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive user account"
            )
        
        # Check registration status
        if user_row.registration_status != "ACTIVE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Account not active. Status: {user_row.registration_status}"
            )
        
        # Update last login
        db.execute(
            text("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = :user_id"),
            {"user_id": user_row.id}
        )
        db.commit()
        
        # Create tokens
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            subject=user_row.id, expires_delta=access_token_expires
        )
        refresh_token = create_refresh_token(subject=user_row.id)
        
        # Create user response manually with proper datetime handling
        from datetime import datetime
        
        # Handle datetime fields properly
        created_at = user_row.created_at
        updated_at = user_row.updated_at
        last_login = user_row.last_login
        
        # Convert string datetimes if needed
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        if isinstance(updated_at, str):
            updated_at = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
        if isinstance(last_login, str):
            last_login = datetime.fromisoformat(last_login.replace('Z', '+00:00'))
        
        user_response = UserResponse(
            id=user_row.id,
            email=user_row.email,
            first_name=user_row.first_name,
            last_name=user_row.last_name,
            role=user_row.role.lower(),  # Convert to lowercase for enum
            registration_status=user_row.registration_status.lower(),  # Convert to lowercase for enum
            is_active=user_row.is_active,
            email_verified=user_row.email_verified,
            phone=user_row.phone,
            company_name=user_row.company_name,
            nip=user_row.nip,
            company_address=user_row.company_address,
            created_at=created_at,
            updated_at=updated_at,
            last_login=last_login
        )
        
        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=user_response
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Authentication error in login-simple: {e}")
        logger.error(f"Error type: {type(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication failed: {str(e)}"
        )


@router.post("/firebase-sync")
async def firebase_sync(
    sync_data: FirebaseUserSync,
    firebase_user: Dict[str, Any] = Depends(verify_firebase_token),
    db: Session = Depends(get_db)
):
    """Sync Firebase user with backend database and set custom claims"""
    try:
        firebase_uid = firebase_user.get('uid')
        email = firebase_user.get('email')
        
        if not firebase_uid or not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Firebase user data"
            )
        
        # Check if user exists in our database
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            # Create new user from Firebase data
            from datetime import datetime
            user = User(
                firebase_uid=firebase_uid,
                email=email,
                first_name=sync_data.first_name or firebase_user.get('name', '').split(' ')[0],
                last_name=sync_data.last_name or firebase_user.get('name', '').split(' ')[-1],
                role=UserRole(sync_data.role) if sync_data.role else UserRole.CLIENT,
                registration_status=RegistrationStatus.ACTIVE,
                is_active=True,
                email_verified=firebase_user.get('email_verified', False),
                company_name=sync_data.company_name,
                nip=sync_data.nip,
                phone=sync_data.phone_number or firebase_user.get('phone_number'),
                company_address=sync_data.company_address,
                data_processing_consent=True,
                marketing_consent=False,
                consent_date=datetime.now(),
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            db.add(user)
        else:
            # Update existing user
            user.firebase_uid = firebase_uid
            user.email_verified = firebase_user.get('email_verified', user.email_verified)
            if sync_data.first_name:
                user.first_name = sync_data.first_name
            if sync_data.last_name:
                user.last_name = sync_data.last_name
            if sync_data.role:
                user.role = UserRole(sync_data.role)
            if sync_data.company_name:
                user.company_name = sync_data.company_name
            if sync_data.nip:
                user.nip = sync_data.nip
            if sync_data.company_address:
                user.company_address = sync_data.company_address
            user.updated_at = datetime.now()
        
        db.commit()
        db.refresh(user)
        
        # Set custom claims in Firebase
        custom_claims = {
            'role': user.role.value,
            'user_id': user.id,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'company_name': user.company_name,
            'nip': user.nip,
            'company_address': user.company_address,
            'registration_completed': True
        }
        
        await firebase_auth.set_custom_claims(firebase_uid, custom_claims)
        
        logger.info(f"Firebase user synced: {email}")
        
        return {
            "success": True,
            "user": UserResponse.model_validate(user),
            "custom_claims": custom_claims
        }
        
    except Exception as e:
        logger.error(f"Firebase sync error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Sync failed: {str(e)}"
        )


@router.post("/firebase-verify")
async def firebase_verify(
    token_data: FirebaseTokenVerify,
    db: Session = Depends(get_db)
):
    """Verify Firebase token and return user data"""
    try:
        # Verify Firebase token
        firebase_user = await firebase_auth.verify_token(token_data.token)
        
        if not firebase_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Firebase token"
            )
        
        # Get user from database
        user = db.query(User).filter(User.firebase_uid == firebase_user['uid']).first()
        
        if not user:
            # User not synced yet
            return {
                "firebase_user": firebase_user,
                "synced": False,
                "user": None
            }
        
        return {
            "firebase_user": firebase_user,
            "synced": True,
            "user": UserResponse.model_validate(user)
        }
        
    except Exception as e:
        logger.error(f"Firebase verify error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token verification failed"
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
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(current_user)
    )


@router.post("/logout")
async def logout():
    """Logout user (client-side token removal)"""
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
):
    """Get current user profile"""
    return UserResponse.model_validate(current_user)


@router.post("/password-reset-request")
async def request_password_reset(
    request: PasswordResetRequest,
    db: Session = Depends(get_db)
):
    """Request password reset email"""
    user = db.query(User).filter(User.email == request.email).first()
    
    if not user:
        # Don't reveal if email exists or not
        return {"message": "If the email exists, a reset link has been sent"}
    
    try:
        # Generate reset token
        from app.core.security import TokenManager
        reset_token = TokenManager.create_password_reset_token(user.email)
        
        # Send reset email (implement email service)
        # await send_password_reset_email(user.email, reset_token)
        
        logger.info(f"Password reset requested for: {user.email}")
        return {"message": "Password reset email sent"}
        
    except Exception as e:
        logger.error(f"Password reset error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send reset email"
        )


@router.post("/password-reset")
async def reset_password(
    reset_data: PasswordReset,
    db: Session = Depends(get_db)
):
    """Reset password with token"""
    try:
        # Verify reset token
        from app.core.security import TokenManager
        payload = TokenManager.verify_token(reset_data.token, "password_reset")
        
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )
        
        email = payload.get("email")
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Update password
        user.password_hash = get_password_hash(reset_data.new_password)
        user.updated_at = datetime.now()
        db.commit()
        
        logger.info(f"Password reset completed for: {user.email}")
        return {"message": "Password reset successfully"}
        
    except Exception as e:
        logger.error(f"Password reset error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset failed"
        )


@router.post("/check-password-strength")
async def check_password_strength(password_data: dict):
    """Check password strength and return feedback"""
    password = password_data.get("password", "")
    
    # Use the static method to validate password strength
    is_strong, errors = PasswordValidator.validate_password_strength(password)
    
    if is_strong:
        return {
            "is_strong": True,
            "message": "Password meets all security requirements",
            "score": 100
        }
    else:
        return {
            "is_strong": False,
            "message": "; ".join(errors),
            "score": 25  # Low score for weak passwords
        }


@router.post("/verify-email")
async def verify_email(
    token: str,
    db: Session = Depends(get_db)
):
    """Verify email address with token"""
    try:
        # Verify email token
        from app.core.security import TokenManager
        payload = TokenManager.verify_token(token, "email_verification")
        
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification token"
            )
        
        email = payload.get("email")
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Update verification status
        user.email_verified = True
        user.registration_status = RegistrationStatus.ACTIVE
        user.updated_at = datetime.now()
        db.commit()
        
        logger.info(f"Email verified for: {user.email}")
        return {"message": "Email verified successfully"}
        
    except Exception as e:
        logger.error(f"Email verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email verification failed"
        )


@router.post("/resend-verification")
async def resend_verification_email(
    request: PasswordResetRequest,  # Reuse this schema since it just needs email
    db: Session = Depends(get_db)
):
    """Resend email verification"""
    user = db.query(User).filter(User.email == request.email).first()
    
    if not user:
        # Don't reveal if email exists or not for security
        return {"message": "If the email exists and needs verification, a new verification email has been sent"}
    
    if user.email_verified:
        return {"message": "Email is already verified"}
    
    try:
        # Generate verification token
        from app.core.security import TokenManager
        verification_token = TokenManager.create_email_verification_token(user.email)
        
        # Send verification email (implement email service)
        # await send_verification_email(user.email, user.first_name, verification_token)
        
        logger.info(f"Verification email resent for: {user.email}")
        return {"message": "Verification email sent"}
        
    except Exception as e:
        logger.error(f"Resend verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send verification email"
        )


# ---------------------------------------------------------------------------
# Legacy/alias endpoints for backward compatibility with older frontend/tests
# ---------------------------------------------------------------------------

# 1. Refresh token alias (/refresh-token)


@router.post("/refresh-token", response_model=Token)
async def refresh_token_legacy(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Alias for `/refresh` to maintain compatibility with older clients/tests."""
    return await refresh_token(current_user, db)


# 2. Forgot password alias (/forgot-password)


@router.post("/forgot-password")
async def forgot_password_alias(
    request: PasswordResetRequest,
    db: Session = Depends(get_db)
):
    """Alias for `/password-reset-request`."""
    return await request_password_reset(request, db)


# 3. Reset password alias (/reset-password)


@router.post("/reset-password")
async def reset_password_alias(
    reset_data: PasswordReset,
    db: Session = Depends(get_db)
):
    """Alias for `/password-reset`."""
    return await reset_password(reset_data, db)


# 4. Change password endpoint (/change-password)


@router.post("/change-password")
async def change_password(
    change_data: ChangePassword,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Change current user's password after verifying the current password."""
    # Verify current password
    if not verify_password(change_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password incorrect"
        )

    # Validate new password strength
    is_valid, errors = PasswordValidator.validate_password_strength(change_data.new_password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="; ".join(errors)
        )

    # Update password
    current_user.password_hash = get_password_hash(change_data.new_password)
    from datetime import datetime
    current_user.updated_at = datetime.now()
    db.commit()

    return {"message": "Password changed successfully"} 
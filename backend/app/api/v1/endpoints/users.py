from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.schemas.user import UserResponse, UserUpdate, UserSettings, UserSettingsUpdate

router = APIRouter()


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user profile"""
    return current_user


@router.get("/me/debug")
def debug_current_user(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Debug endpoint to check user role"""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": str(current_user.role),
        "role_value": current_user.role.value if hasattr(current_user.role, 'value') else None,
        "role_type": str(type(current_user.role)),
        "is_client": current_user.role == UserRole.CLIENT,
        "is_manufacturer": current_user.role == UserRole.MANUFACTURER,
        "is_admin": current_user.role == UserRole.ADMIN,
        "role_comparison_debug": {
            "role_equals_client_string": str(current_user.role) == "client",
            "role_equals_CLIENT_string": str(current_user.role) == "CLIENT",
            "role_value_equals_client": current_user.role.value == "client" if hasattr(current_user.role, 'value') else None,
            "role_equals_UserRole_CLIENT": current_user.role == UserRole.CLIENT,
            "role_equals_UserRole_MANUFACTURER": current_user.role == UserRole.MANUFACTURER,
        }
    }


@router.patch("/me", response_model=UserResponse)
def update_user_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user profile"""
    # Update user fields
    update_data = user_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    db.commit()
    db.refresh(current_user)
    return current_user


@router.delete("/me")
def delete_user_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete current user account (GDPR compliance)"""
    # Soft delete - just deactivate
    current_user.is_active = False
    current_user.gdpr_data_deletion_requested = datetime.utcnow()
    db.commit()
    
    return {"message": "Account deletion requested. Your data will be removed within 30 days."}


@router.get("/{user_id}", response_model=UserResponse)
def get_user_by_id(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user by ID (admin only or self)"""
    # Only admin can access other users, or users can access themselves
    if current_user.role != UserRole.ADMIN and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this user"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user


@router.get("/settings", response_model=UserSettings)
def get_user_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user settings"""
    # Return current user settings or defaults
    return UserSettings(
        email_notifications=getattr(current_user, 'email_notifications', True),
        sms_notifications=getattr(current_user, 'sms_notifications', False),
        browser_notifications=getattr(current_user, 'browser_notifications', True),
        marketing_emails=getattr(current_user, 'marketing_emails', False),
        language=getattr(current_user, 'language', 'en'),
        timezone=getattr(current_user, 'timezone', 'UTC'),
        currency=getattr(current_user, 'currency', 'PLN'),
        theme=getattr(current_user, 'theme', 'light'),
        dashboard_layout=getattr(current_user, 'dashboard_layout', 'default'),
        items_per_page=getattr(current_user, 'items_per_page', 20),
        auto_refresh=getattr(current_user, 'auto_refresh', True),
        show_tutorials=getattr(current_user, 'show_tutorials', True)
    )


@router.put("/settings", response_model=UserSettings)
def update_user_settings(
    settings_update: UserSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user settings"""
    try:
        # Update user settings fields
        update_data = settings_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(current_user, field, value)
        
        current_user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(current_user)
        
        # Return updated settings
        return UserSettings(
            email_notifications=getattr(current_user, 'email_notifications', True),
            sms_notifications=getattr(current_user, 'sms_notifications', False),
            browser_notifications=getattr(current_user, 'browser_notifications', True),
            marketing_emails=getattr(current_user, 'marketing_emails', False),
            language=getattr(current_user, 'language', 'en'),
            timezone=getattr(current_user, 'timezone', 'UTC'),
            currency=getattr(current_user, 'currency', 'PLN'),
            theme=getattr(current_user, 'theme', 'light'),
            dashboard_layout=getattr(current_user, 'dashboard_layout', 'default'),
            items_per_page=getattr(current_user, 'items_per_page', 20),
            auto_refresh=getattr(current_user, 'auto_refresh', True),
            show_tutorials=getattr(current_user, 'show_tutorials', True)
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating user settings"
        )


@router.delete("/settings")
def reset_user_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reset user settings to defaults"""
    try:
        # Reset settings to defaults
        current_user.email_notifications = True
        current_user.sms_notifications = False
        current_user.browser_notifications = True
        current_user.marketing_emails = False
        current_user.language = 'en'
        current_user.timezone = 'UTC'
        current_user.currency = 'PLN'
        current_user.theme = 'light'
        current_user.dashboard_layout = 'default'
        current_user.items_per_page = 20
        current_user.auto_refresh = True
        current_user.show_tutorials = True
        current_user.updated_at = datetime.utcnow()
        
        db.commit()
        return {"message": "User settings reset to defaults"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error resetting user settings"
        )


@router.post("/avatar")
async def upload_user_avatar(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload user avatar (placeholder implementation)"""
    # TODO: Implement file upload for avatar
    return {"message": "Avatar upload endpoint - implementation needed"}


@router.put("/profile", response_model=UserResponse) 
def update_user_profile_extended(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user profile (extended version)"""
    try:
        # Update user fields
        update_data = user_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(current_user, field, value)
        
        current_user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(current_user)
        return current_user
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating user profile"
        )


@router.put("/password")
def change_user_password(
    old_password: str,
    new_password: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change user password"""
    # TODO: Implement password verification and hashing
    # This is a placeholder implementation
    return {"message": "Password change endpoint - implementation needed"}
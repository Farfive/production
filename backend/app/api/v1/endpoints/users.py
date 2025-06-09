from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.schemas.user import UserResponse, UserUpdate

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
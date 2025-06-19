import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.database import get_db
from app.core.firebase_auth import firebase_backend, get_current_firebase_user
from app.models.user import User, UserRole, RegistrationStatus
from app.api.v1.endpoints.auth import get_password_hash

logger = logging.getLogger(__name__)
security = HTTPBearer()

router = APIRouter()

# Pydantic models for requests
class FirebaseCompleteRegistration(BaseModel):
    firstName: str
    lastName: str
    role: UserRole
    companyName: str = ""
    nip: str = ""
    companyAddress: str = ""

class FirebaseUserCreation(BaseModel):
    email: EmailStr
    password: str
    firstName: str
    lastName: str
    role: UserRole
    companyName: str = ""

class FirebaseSyncRequest(BaseModel):
    custom_claims: Dict[str, Any] = Field(default={}, description="Custom claims to set for the user")

class CompleteRegistrationRequest(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    company_name: Optional[str] = Field(None, max_length=255)
    role: UserRole = Field(..., description="User role in the platform")

class GoogleSignInRequest(BaseModel):
    additional_claims: Dict[str, Any] = Field(default={}, description="Additional claims from Google")

class FirebaseStatusResponse(BaseModel):
    firebase_available: bool
    firebase_initialized: bool
    endpoints_enabled: bool
    backend_version: str = "1.0.0"
    supported_features: list = ["email_auth", "google_auth", "custom_claims"]

@router.post("/firebase-sync")
async def firebase_sync(
    request: FirebaseSyncRequest,
    current_user: User = Depends(get_current_firebase_user),
    db: Session = Depends(get_db)
):
    """
    Synchronize Firebase user with backend database and set custom claims
    """
    try:
        # Update custom claims in Firebase
        if request.custom_claims:
            await firebase_backend.set_custom_claims(
                current_user.firebase_uid, 
                request.custom_claims
            )
        
        # Update user in database if needed
        updated = False
        if 'first_name' in request.custom_claims:
            current_user.first_name = request.custom_claims['first_name']
            updated = True
            
        if 'last_name' in request.custom_claims:
            current_user.last_name = request.custom_claims['last_name']
            updated = True
            
        if 'company_name' in request.custom_claims:
            current_user.company_name = request.custom_claims['company_name']
            updated = True
            
        if 'role' in request.custom_claims:
            try:
                new_role = UserRole(request.custom_claims['role'])
                current_user.role = new_role
                updated = True
            except ValueError:
                logger.warning(f"Invalid role: {request.custom_claims['role']}")
        
        if updated:
            db.commit()
            db.refresh(current_user)
        
        return {
            "success": True,
            "message": "User synchronized successfully",
            "user_id": current_user.id,
            "firebase_uid": current_user.firebase_uid,
            "custom_claims_set": bool(request.custom_claims)
        }
        
    except Exception as e:
        logger.error(f"Firebase sync error: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Synchronization failed: {str(e)}"
        )

@router.post("/firebase-complete-registration")
async def complete_registration(
    request: CompleteRegistrationRequest,
    current_user: User = Depends(get_current_firebase_user),
    db: Session = Depends(get_db)
):
    """
    Complete user registration after Firebase authentication
    """
    try:
        # Update user information
        current_user.first_name = request.first_name
        current_user.last_name = request.last_name
        current_user.company_name = request.company_name
        current_user.role = request.role
        current_user.registration_status = RegistrationStatus.ACTIVE  # Fixed enum
        
        # Set custom claims in Firebase
        custom_claims = {
            "role": request.role.value,
            "first_name": request.first_name,
            "last_name": request.last_name,
            "company_name": request.company_name,
            "registration_completed": True
        }
        
        await firebase_backend.set_custom_claims(
            current_user.firebase_uid,
            custom_claims
        )
        
        db.commit()
        db.refresh(current_user)
        
        return {
            "success": True,
            "message": "Registration completed successfully",
            "user": {
                "id": current_user.id,
                "email": current_user.email,
                "firebase_uid": current_user.firebase_uid,
                "first_name": current_user.first_name,
                "last_name": current_user.last_name,
                "company_name": current_user.company_name,
                "role": current_user.role.value,
                "registration_status": current_user.registration_status.value
            }
        }
        
    except Exception as e:
        logger.error(f"Registration completion error: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration completion failed: {str(e)}"
        )

@router.post("/firebase-google-signin")
async def google_signin_complete(
    request: GoogleSignInRequest,
    current_user: User = Depends(get_current_firebase_user),
    db: Session = Depends(get_db)
):
    """
    Complete Google sign-in process with additional claims
    """
    try:
        # Set additional custom claims if provided
        if request.additional_claims:
            await firebase_backend.set_custom_claims(
                current_user.firebase_uid,
                request.additional_claims
            )
        
        # If this is a new user, they might need to complete registration
        registration_needed = (
            not current_user.first_name or 
            not current_user.last_name or
            current_user.registration_status != RegistrationStatus.ACTIVE
        )
        
        return {
            "success": True,
            "message": "Google sign-in completed",
            "user": {
                "id": current_user.id,
                "email": current_user.email,
                "firebase_uid": current_user.firebase_uid,
                "first_name": current_user.first_name,
                "last_name": current_user.last_name,
                "company_name": current_user.company_name,
                "role": current_user.role.value,
                "registration_status": current_user.registration_status.value
            },
            "registration_needed": registration_needed
        }
        
    except Exception as e:
        logger.error(f"Google signin completion error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Google sign-in completion failed: {str(e)}"
        )

@router.get("/firebase-status", response_model=FirebaseStatusResponse)
async def get_firebase_status():
    """
    Get Firebase implementation status
    """
    from app.core.firebase_auth import FIREBASE_AVAILABLE
    
    return FirebaseStatusResponse(
        firebase_available=FIREBASE_AVAILABLE,
        firebase_initialized=firebase_backend._initialized if FIREBASE_AVAILABLE else False,
        endpoints_enabled=FIREBASE_AVAILABLE
    )

@router.post("/create-firebase-user")
async def create_firebase_user(
    user_data: FirebaseUserCreation,
    current_user: User = Depends(get_current_firebase_user),
    db: Session = Depends(get_db)
):
    """Create a new Firebase user (admin only)"""
    try:
        # Check if current user is admin
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can create users"
            )
        
        # Create Firebase user
        firebase_uid = await firebase_backend.create_firebase_user(
            email=user_data.email,
            password=user_data.password,
            display_name=f"{user_data.firstName} {user_data.lastName}"
        )
        
        # Create user in database
        new_user = User(
            firebase_uid=firebase_uid,
            email=user_data.email,
            first_name=user_data.firstName,
            last_name=user_data.lastName,
            role=user_data.role,
            company_name=user_data.companyName,
            status=RegistrationStatus.ACTIVE,
            email_verified=True,
            # Set hashed password for fallback auth
            hashed_password=get_password_hash(user_data.password)
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Set custom claims
        custom_claims = {
            "role": user_data.role.value,
            "permissions": _get_role_permissions(user_data.role),
            "first_name": user_data.firstName,
            "last_name": user_data.lastName,
            "company_name": user_data.companyName,
            "admin_created": True
        }
        
        await firebase_backend.set_custom_claims(firebase_uid, custom_claims)
        
        logger.info(f"Firebase user created by admin: {user_data.email}")
        
        return {
            "message": "User created successfully",
            "user": {
                "id": new_user.id,
                "email": new_user.email,
                "role": new_user.role.value,
                "firebase_uid": firebase_uid
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating Firebase user: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )

@router.get("/profile")
async def get_firebase_profile(
    current_user: User = Depends(get_current_firebase_user)
):
    """Get current user profile"""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "firstName": current_user.first_name,
        "lastName": current_user.last_name,
        "role": current_user.role.value,
        "companyName": current_user.company_name,
        "emailVerified": current_user.email_verified,
        "isActive": current_user.is_active,
        "firebaseUid": current_user.firebase_uid
    }

@router.post("/update-custom-claims")
async def update_user_custom_claims(
    user_id: int,
    claims: Dict[str, Any],
    current_user: User = Depends(get_current_firebase_user),
    db: Session = Depends(get_db)
):
    """Update user custom claims (admin only)"""
    try:
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can update user claims"
            )
        
        # Get target user
        target_user = db.query(User).filter(User.id == user_id).first()
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        if not target_user.firebase_uid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is not a Firebase user"
            )
        
        # Update custom claims
        await firebase_backend.set_custom_claims(target_user.firebase_uid, claims)
        
        return {"message": "Custom claims updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating custom claims: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update custom claims"
        )

def _get_role_permissions(role: UserRole) -> list:
    """Get permissions for a user role"""
    permissions_map = {
        UserRole.ADMIN: [
            "manage_users", "view_analytics", "manage_orders", 
            "manage_manufacturers", "system_admin", "view_all_data"
        ],
        UserRole.MANUFACTURER: [
            "create_quotes", "manage_inventory", "view_orders", 
            "manage_company_profile", "view_analytics_limited"
        ],
        UserRole.CLIENT: [
            "place_orders", "view_quotes", "track_shipments", 
            "manage_profile", "view_order_history"
        ]
    }
    
    return permissions_map.get(role, []) 
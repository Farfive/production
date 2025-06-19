import os
import json
import logging
from typing import Optional, Dict, Any
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

# Make Firebase imports optional
try:
    import firebase_admin
    from firebase_admin import credentials, auth as firebase_auth
    FIREBASE_AVAILABLE = True
except ImportError:
    firebase_admin = None
    firebase_auth = None
    FIREBASE_AVAILABLE = False
    logging.warning("Firebase Admin SDK not installed. Firebase authentication disabled.")

from app.core.database import get_db
from app.models.user import User, UserRole, RegistrationStatus
from app.core.config import settings

logger = logging.getLogger(__name__)

class FirebaseAuthBackend:
    def __init__(self):
        self.security = HTTPBearer()
        self._initialized = False
        if FIREBASE_AVAILABLE:
            self._initialize_firebase()
    
    def _initialize_firebase(self):
        """Initialize Firebase Admin SDK"""
        if self._initialized or not FIREBASE_AVAILABLE:
            return
            
        try:
            if not firebase_admin._apps:
                if settings.ENVIRONMENT == "development":
                    # For development - use emulator or service account
                    if os.path.exists("serviceAccountKey.json"):
                        cred = credentials.Certificate("serviceAccountKey.json")
                        firebase_admin.initialize_app(cred)
                        logger.info("Firebase initialized with service account")
                    else:
                        # Initialize with default credentials for emulator
                        firebase_admin.initialize_app()
                        logger.info("Firebase initialized for emulator")
                else:
                    # Production - use service account
                    if os.path.exists("serviceAccountKey.json"):
                        cred = credentials.Certificate("serviceAccountKey.json")
                        firebase_admin.initialize_app(cred)
                        logger.info("Firebase initialized for production")
                    else:
                        # Use environment variable for service account
                        service_account_info = os.getenv('FIREBASE_SERVICE_ACCOUNT')
                        if service_account_info:
                            service_account = json.loads(service_account_info)
                            cred = credentials.Certificate(service_account)
                            firebase_admin.initialize_app(cred)
                            logger.info("Firebase initialized with env credentials")
                        else:
                            logger.warning("⚠️ Firebase credentials not found")
                            
            self._initialized = True
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Firebase: {e}")
            # Don't raise exception to allow fallback to regular auth
    
    async def verify_token(
        self, 
        credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer()),
        db: Session = Depends(get_db)
    ):
        """Verify Firebase ID token and return user info"""
        if not FIREBASE_AVAILABLE:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Firebase authentication not available - package not installed"
            )
            
        try:
            if not self._initialized:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Firebase authentication not available"
                )
            
            # Verify the ID token
            decoded_token = firebase_auth.verify_id_token(credentials.credentials)
            
            # Extract user info
            firebase_uid = decoded_token['uid']
            email = decoded_token.get('email')
            email_verified = decoded_token.get('email_verified', False)
            custom_claims = decoded_token.get('custom_claims', {})
            
            # Get or create user in database
            user = await self.get_or_create_user(
                db, firebase_uid, email, email_verified, custom_claims
            )
            
            return user
            
        except Exception as e:
            logger.error(f"Firebase auth error: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication failed"
            )
    
    async def get_or_create_user(
        self, 
        db: Session, 
        firebase_uid: str, 
        email: str, 
        email_verified: bool,
        custom_claims: Dict[str, Any]
    ) -> User:
        """Get user from database or create if doesn't exist"""
        try:
            # Check if user exists in database
            user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
            
            if not user:
                # Check if user exists by email (for migration)
                existing_user = db.query(User).filter(User.email == email).first()
                
                if existing_user:
                    # Migrate existing user to Firebase
                    existing_user.firebase_uid = firebase_uid
                    existing_user.email_verified = email_verified
                    db.commit()
                    user = existing_user
                    logger.info(f"Migrated user {email} to Firebase")
                else:
                    # Create new user
                    user = User(
                        firebase_uid=firebase_uid,
                        email=email,
                        role=UserRole(custom_claims.get('role', 'client')),
                        registration_status=RegistrationStatus.ACTIVE,
                        email_verified=email_verified,
                        first_name=custom_claims.get('first_name', ''),
                        last_name=custom_claims.get('last_name', ''),
                        company_name=custom_claims.get('company_name', '')
                    )
                    db.add(user)
                    db.commit()
                    db.refresh(user)
                    logger.info(f"Created new Firebase user: {email}")
            else:
                # Update existing user info
                if user.email_verified != email_verified:
                    user.email_verified = email_verified
                    db.commit()
            
            return user
            
        except Exception as e:
            logger.error(f"Error getting/creating user: {e}")
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to process user data"
            )
    
    async def set_custom_claims(self, firebase_uid: str, claims: Dict[str, Any]):
        """Set custom claims for user (role, permissions, etc.)"""
        if not FIREBASE_AVAILABLE:
            logger.warning("Firebase not available, cannot set custom claims")
            return
            
        try:
            if not self._initialized:
                logger.warning("Firebase not initialized, cannot set custom claims")
                return
                
            firebase_auth.set_custom_user_claims(firebase_uid, claims)
            logger.info(f"Custom claims set for user {firebase_uid}: {claims}")
            
        except Exception as e:
            logger.error(f"Error setting custom claims: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to set user permissions"
            )
    
    async def create_firebase_user(
        self, 
        email: str, 
        password: str, 
        display_name: str = None
    ) -> str:
        """Create a new Firebase user (for admin user creation)"""
        try:
            if not self._initialized:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Firebase authentication not available"
                )
            
            user_record = firebase_auth.create_user(
                email=email,
                password=password,
                display_name=display_name,
                email_verified=True
            )
            
            logger.info(f"Created Firebase user: {email}")
            return user_record.uid
            
        except firebase_auth.EmailAlreadyExistsError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists"
            )
        except Exception as e:
            logger.error(f"Error creating Firebase user: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user"
            )
    
    async def delete_firebase_user(self, firebase_uid: str):
        """Delete a Firebase user"""
        try:
            if not self._initialized:
                logger.warning("Firebase not initialized, cannot delete user")
                return
                
            firebase_auth.delete_user(firebase_uid)
            logger.info(f"Deleted Firebase user: {firebase_uid}")
            
        except Exception as e:
            logger.error(f"Error deleting Firebase user: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete user"
            )


# Global instance
firebase_backend = FirebaseAuthBackend()

# Dependency for protected routes
async def get_current_firebase_user(
    user: User = Depends(firebase_backend.verify_token)
) -> User:
    """Get current authenticated Firebase user"""
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )
    return user

# Optional Firebase auth (fallback to regular auth)
async def get_current_user_optional_firebase(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Try Firebase auth first, fallback to regular auth if needed"""
    if not credentials:
        return None
    
    if not FIREBASE_AVAILABLE:
        # Fallback to regular JWT auth
        from app.core.security import get_current_user
        try:
            return await get_current_user(credentials, db)
        except HTTPException:
            return None
    
    try:
        # Try Firebase auth first
        return await firebase_backend.verify_token(credentials, db)
    except HTTPException:
        # Fallback to regular JWT auth
        from app.core.security import get_current_user
        try:
            return await get_current_user(credentials, db)
        except HTTPException:
            return None 

# Additional dependency function for Firebase token verification
async def verify_firebase_token(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())
) -> Dict[str, Any]:
    """FastAPI dependency to verify Firebase token and return decoded token data"""
    if not FIREBASE_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firebase authentication not available"
        )
    
    try:
        # Verify the ID token
        decoded_token = firebase_auth.verify_id_token(credentials.credentials)
        return decoded_token
    except Exception as e:
        logger.error(f"Firebase token verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Firebase token"
        ) 
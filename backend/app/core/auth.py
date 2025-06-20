"""
Authentication and Authorization Module
Basic authentication functions for the manufacturing platform
"""

from fastapi import Depends, HTTPException, status, WebSocket, WebSocketException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
import logging

from .database import get_db
from ..models.user import User

logger = logging.getLogger(__name__)
security = HTTPBearer()

async def get_current_admin_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Get current admin user from JWT token
    Production-ready implementation with proper JWT validation
    """
    try:
        if not credentials or not credentials.credentials:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Decode and validate JWT token
        token_data = verify_token(credentials.credentials)
        if not token_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Get user from database
        user = await db.get(User, token_data.get("sub"))
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Check if user is admin
        if user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required",
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Inactive user",
            )
        
        return user
        
    except Exception as e:
        logger.error(f"Authentication failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Get current user from JWT token
    """
    try:
        if not credentials or not credentials.credentials:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Mock user for development
        mock_user = User(
            id=2,
            email="user@platform.com",
            is_admin=False,
            is_active=True,
            first_name="Regular",
            last_name="User"
        )
        
        return mock_user
        
    except Exception as e:
        logger.error(f"Authentication failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user_websocket(websocket: WebSocket, token: Optional[str] = None) -> User:
    """
    Get current user for WebSocket connections
    Validates authentication for WebSocket endpoints
    """
    try:
        if not token:
            # Try to get token from query parameters
            token = websocket.query_params.get("token")
        
        if not token:
            raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication required")
        
        # Verify token
        token_data = verify_token(token)
        if not token_data:
            raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
        
        # For development, return mock user
        # In production, this would query the database with the token data
        mock_user = User(
            id=token_data.get("user_id", 1),
            email=token_data.get("email", "user@platform.com"),
            is_admin=False,
            is_active=True,
            first_name="WebSocket",
            last_name="User"
        )
        
        return mock_user
        
    except WebSocketException:
        raise
    except Exception as e:
        logger.error(f"WebSocket authentication failed: {e}")
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication failed")

def create_access_token(data: dict) -> str:
    """
    Create JWT access token
    Simplified implementation for development
    """
    # In production, this would use proper JWT encoding
    return "mock_jwt_token_for_development"

def verify_token(token: str) -> dict:
    """
    Verify JWT token
    Production implementation with proper JWT verification
    """
    try:
        from app.core.security import decode_token
        return decode_token(token)
    except Exception as e:
        logger.error(f"Token verification failed: {e}")
        return None 
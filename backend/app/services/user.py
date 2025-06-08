"""
User service for managing user operations
"""
from typing import Optional
from sqlalchemy.orm import Session
from app.models.user import User
from app.core.database import get_db


class UserService:
    """Service for user-related operations"""
    
    def __init__(self, db: Session = None):
        self.db = db or next(get_db())
    
    async def get_user_by_id(self, user_id: int) -> Optional[User]:
        """Get user by ID"""
        try:
            return self.db.query(User).filter(User.id == user_id).first()
        except Exception as e:
            return None
    
    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        try:
            return self.db.query(User).filter(User.email == email).first()
        except Exception as e:
            return None 
"""
User service for managing user operations
"""
import logging
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from app.models.user import User
from app.core.database import get_db
from app.core.monitoring import performance_monitor

logger = logging.getLogger(__name__)


class UserService:
    """Service for user-related operations"""
    
    def __init__(self, db: Session = None):
        self.db = db
    
    def get_user_by_id(self, user_id: int, db: Session = None) -> Optional[User]:
        """Get user by ID"""
        session = db or self.db
        if not session:
            raise ValueError("Database session is required")
            
        try:
            import time
            start_time = time.time()
            
            user = session.query(User).filter(User.id == user_id).first()
            
            # Track performance
            duration = time.time() - start_time
            performance_monitor.track_database_query("SELECT", "users", duration)
            
            return user
        except SQLAlchemyError as e:
            logger.error(f"Database error getting user by ID {user_id}: {e}")
            performance_monitor.track_error(e, {"user_id": user_id, "operation": "get_user_by_id"})
            return None
        except Exception as e:
            logger.error(f"Unexpected error getting user by ID {user_id}: {e}")
            performance_monitor.track_error(e, {"user_id": user_id, "operation": "get_user_by_id"})
            return None
    
    def get_user_by_email(self, email: str, db: Session = None) -> Optional[User]:
        """Get user by email"""
        session = db or self.db
        if not session:
            raise ValueError("Database session is required")
            
        try:
            import time
            start_time = time.time()
            
            user = session.query(User).filter(User.email == email).first()
            
            # Track performance
            duration = time.time() - start_time
            performance_monitor.track_database_query("SELECT", "users", duration)
            
            return user
        except SQLAlchemyError as e:
            logger.error(f"Database error getting user by email {email}: {e}")
            performance_monitor.track_error(e, {"email": email, "operation": "get_user_by_email"})
            return None
        except Exception as e:
            logger.error(f"Unexpected error getting user by email {email}: {e}")
            performance_monitor.track_error(e, {"email": email, "operation": "get_user_by_email"})
            return None
    
    def create_user(self, user_data: dict, db: Session = None) -> Optional[User]:
        """Create a new user"""
        session = db or self.db
        if not session:
            raise ValueError("Database session is required")
            
        try:
            import time
            start_time = time.time()
            
            user = User(**user_data)
            session.add(user)
            session.commit()
            session.refresh(user)
            
            # Track performance
            duration = time.time() - start_time
            performance_monitor.track_database_query("INSERT", "users", duration)
            
            logger.info(f"User created successfully: {user.email}")
            return user
        except SQLAlchemyError as e:
            session.rollback()
            logger.error(f"Database error creating user: {e}")
            performance_monitor.track_error(e, {"user_data": user_data, "operation": "create_user"})
            return None
        except Exception as e:
            session.rollback()
            logger.error(f"Unexpected error creating user: {e}")
            performance_monitor.track_error(e, {"user_data": user_data, "operation": "create_user"})
            return None
    
    def update_user(self, user_id: int, update_data: dict, db: Session = None) -> Optional[User]:
        """Update user information"""
        session = db or self.db
        if not session:
            raise ValueError("Database session is required")
            
        try:
            import time
            start_time = time.time()
            
            user = session.query(User).filter(User.id == user_id).first()
            if not user:
                return None
            
            for key, value in update_data.items():
                if hasattr(user, key):
                    setattr(user, key, value)
            
            session.commit()
            session.refresh(user)
            
            # Track performance
            duration = time.time() - start_time
            performance_monitor.track_database_query("UPDATE", "users", duration)
            
            logger.info(f"User updated successfully: {user.email}")
            return user
        except SQLAlchemyError as e:
            session.rollback()
            logger.error(f"Database error updating user {user_id}: {e}")
            performance_monitor.track_error(e, {"user_id": user_id, "operation": "update_user"})
            return None
        except Exception as e:
            session.rollback()
            logger.error(f"Unexpected error updating user {user_id}: {e}")
            performance_monitor.track_error(e, {"user_id": user_id, "operation": "update_user"})
            return None
    
    def delete_user(self, user_id: int, db: Session = None) -> bool:
        """Delete a user"""
        session = db or self.db
        if not session:
            raise ValueError("Database session is required")
            
        try:
            import time
            start_time = time.time()
            
            user = session.query(User).filter(User.id == user_id).first()
            if not user:
                return False
            
            session.delete(user)
            session.commit()
            
            # Track performance
            duration = time.time() - start_time
            performance_monitor.track_database_query("DELETE", "users", duration)
            
            logger.info(f"User deleted successfully: {user.email}")
            return True
        except SQLAlchemyError as e:
            session.rollback()
            logger.error(f"Database error deleting user {user_id}: {e}")
            performance_monitor.track_error(e, {"user_id": user_id, "operation": "delete_user"})
            return False
        except Exception as e:
            session.rollback()
            logger.error(f"Unexpected error deleting user {user_id}: {e}")
            performance_monitor.track_error(e, {"user_id": user_id, "operation": "delete_user"})
            return False
    
    def get_users_by_role(self, role: str, db: Session = None) -> List[User]:
        """Get users by role"""
        session = db or self.db
        if not session:
            raise ValueError("Database session is required")
            
        try:
            import time
            start_time = time.time()
            
            users = session.query(User).filter(User.role == role).all()
            
            # Track performance
            duration = time.time() - start_time
            performance_monitor.track_database_query("SELECT", "users", duration)
            
            return users
        except SQLAlchemyError as e:
            logger.error(f"Database error getting users by role {role}: {e}")
            performance_monitor.track_error(e, {"role": role, "operation": "get_users_by_role"})
            return []
        except Exception as e:
            logger.error(f"Unexpected error getting users by role {role}: {e}")
            performance_monitor.track_error(e, {"role": role, "operation": "get_users_by_role"})
            return [] 
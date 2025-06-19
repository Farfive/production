#!/usr/bin/env python3
"""
Recreate database with proper schema
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app.core.database import engine, Base
from app.models.user import User, UserRole, RegistrationStatus
from app.core.security import get_password_hash
from sqlalchemy.orm import sessionmaker
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def recreate_database():
    """Recreate database with proper schema and test users"""
    
    try:
        # Drop all tables
        logger.info("🗑️ Dropping all tables...")
        Base.metadata.drop_all(bind=engine)
        
        # Create all tables
        logger.info("🏗️ Creating all tables...")
        Base.metadata.create_all(bind=engine)
        
        # Create session
        Session = sessionmaker(bind=engine)
        db = Session()
        
        # Create test users
        test_users = [
            {
                "email": "test.client@example.com",
                "password": "TestPassword123!",
                "role": UserRole.CLIENT,
                "first_name": "Test",
                "last_name": "Client",
                "company_name": "Test Client Company"
            },
            {
                "email": "test.manufacturer@example.com",
                "password": "TestPassword123!",
                "role": UserRole.MANUFACTURER,
                "first_name": "Test",
                "last_name": "Manufacturer",
                "company_name": "Test Manufacturer Company"
            },
            {
                "email": "test.admin@example.com",
                "password": "TestPassword123!",
                "role": UserRole.ADMIN,
                "first_name": "Test",
                "last_name": "Admin",
                "company_name": "Test Admin Company"
            }
        ]
        
        for user_data in test_users:
            user = User(
                email=user_data["email"],
                password_hash=get_password_hash(user_data["password"]),
                first_name=user_data["first_name"],
                last_name=user_data["last_name"],
                company_name=user_data["company_name"],
                role=user_data["role"],
                is_active=True,
                email_verified=True,
                registration_status=RegistrationStatus.ACTIVE,
                data_processing_consent=True,
                marketing_consent=False
            )
            db.add(user)
            logger.info(f"✅ Created user: {user.email} with role {user.role}")
        
        db.commit()
        logger.info("✅ Database recreated successfully with test users")
        
        # Verify users
        for user_data in test_users:
            user = db.query(User).filter(User.email == user_data["email"]).first()
            if user:
                logger.info(f"✅ Verified user: {user.email} - Active: {user.is_active}, Role: {user.role}")
            else:
                logger.error(f"❌ User not found: {user_data['email']}")
                
        db.close()
        
    except Exception as e:
        logger.error(f"❌ Error recreating database: {e}")
        raise

if __name__ == "__main__":
    recreate_database() 
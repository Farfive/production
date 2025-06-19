#!/usr/bin/env python3
"""
Database Repair Script - Fix relationship mapping issues
"""

import sys
import os
import logging
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    try:
        logger.info("🔧 Starting database repair...")
        
        # Import dependencies
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        from app.core.database import Base
        
        # Import all models
        from app.models import user, producer, order, quote, quote_template, payment
        
        # Remove existing database
        db_path = "./backend/manufacturing_platform.db"
        if os.path.exists(db_path):
            os.remove(db_path)
            logger.info("✅ Removed existing database")
        
        # Create new database
        database_url = "sqlite:///./manufacturing_platform.db"
        engine = create_engine(database_url, echo=False)
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Created database tables")
        
        # Test relationships
        SessionLocal = sessionmaker(bind=engine)
        db = SessionLocal()
        
        from app.models.user import User, UserRole, RegistrationStatus
        from app.models.producer import Manufacturer
        from app.core.security import get_password_hash
        
        # Create test user
        test_user = User(
            email="test@example.com",
            password_hash=get_password_hash("TestPassword123!"),
            first_name="Test",
            last_name="User", 
            role=UserRole.MANUFACTURER,
            registration_status=RegistrationStatus.ACTIVE,
            is_active=True,
            email_verified=True,
            data_processing_consent=True
        )
        db.add(test_user)
        db.commit()
        
        # Create manufacturer
        manufacturer = Manufacturer(
            user_id=test_user.id,
            business_name="Test Company",
            city="Warsaw",
            country="PL",
            is_active=True
        )
        db.add(manufacturer)
        db.commit()
        
        logger.info("✅ Database relationships working")
        logger.info("🎉 Database repair completed!")
        
        db.close()
        return True
        
    except Exception as e:
        logger.error(f"❌ Database repair failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    if main():
        print("Database is ready for tests!")
    else:
        print("Database repair failed!")
        sys.exit(1) 
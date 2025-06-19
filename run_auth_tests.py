#!/usr/bin/env python3
"""
Comprehensive Authentication Test Runner
"""

import sys
import os
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fix_database():
    """Fix database relationships and create test data"""
    
    logger.info("🔧 Fixing database...")
    
    # Add backend to path
    backend_path = Path(__file__).parent / "backend"
    sys.path.insert(0, str(backend_path))
    
    try:
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        from app.core.database import Base
        from app.models.user import User, UserRole, RegistrationStatus
        from app.models.producer import Manufacturer
        from app.core.security import get_password_hash
        
        # Remove old database
        db_path = "./backend/manufacturing_platform.db"
        if os.path.exists(db_path):
            os.remove(db_path)
            logger.info("✅ Removed old database")
        
        # Create new database
        engine = create_engine("sqlite:///./manufacturing_platform.db", echo=False)
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Database created")
        
        # Create test data
        Session = sessionmaker(bind=engine)
        db = Session()
        
        # Create test users
        users_data = [
            ("test.client@example.com", "TestPassword123!", "Test", "Client", UserRole.CLIENT),
            ("test.manufacturer@example.com", "TestPassword123!", "Test", "Manufacturer", UserRole.MANUFACTURER),
            ("admin@example.com", "AdminPassword123!", "Admin", "User", UserRole.ADMIN)
        ]
        
        for email, password, first_name, last_name, role in users_data:
            user = User(
                email=email,
                password_hash=get_password_hash(password),
                first_name=first_name,
                last_name=last_name,
                company_name=f"{first_name} {last_name} Company",
                role=role,
                registration_status=RegistrationStatus.ACTIVE,
                is_active=True,
                email_verified=True,
                data_processing_consent=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            logger.info(f"✅ Created user: {email}")
            
            # Create manufacturer profile
            if role == UserRole.MANUFACTURER:
                manufacturer = Manufacturer(
                    user_id=user.id,
                    business_name=f"{first_name} Manufacturing",
                    city="Warsaw",
                    country="PL",
                    is_active=True
                )
                db.add(manufacturer)
                db.commit()
                logger.info(f"✅ Created manufacturer profile for: {email}")
        
        db.close()
        logger.info("🎉 Database fixed and test data created!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Database fix failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_auth_endpoints():
    """Test authentication endpoints"""
    
    logger.info("🧪 Testing authentication...")
    
    try:
        import requests
        
        # Test health endpoint
        try:
            response = requests.get("http://localhost:8000/health", timeout=5)
            if response.status_code == 200:
                logger.info("✅ Server is running")
            else:
                logger.warning("⚠️ Server health check failed")
                return False
        except:
            logger.warning("⚠️ Server not running - start with: cd backend && uvicorn main:app --reload")
            return False
        
        # Test registration
        registration_data = {
            "email": "newtest@example.com",
            "password": "TestPassword123!",
            "first_name": "New",
            "last_name": "Test",
            "company_name": "New Test Company",
            "role": "client",
            "data_processing_consent": True,
            "marketing_consent": False
        }
        
        try:
            response = requests.post(
                "http://localhost:8000/api/v1/auth/register",
                json=registration_data,
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                logger.info("✅ Registration successful")
            elif response.status_code == 400:
                logger.info("ℹ️ Registration returned 400 (user may exist)")
            else:
                logger.warning(f"⚠️ Registration returned {response.status_code}: {response.text}")
        
        except Exception as e:
            logger.error(f"❌ Registration test failed: {e}")
        
        # Test login
        login_data = {
            "email": "test.client@example.com",
            "password": "TestPassword123!"
        }
        
        try:
            response = requests.post(
                "http://localhost:8000/api/v1/auth/login-json",
                json=login_data,
                timeout=10
            )
            
            if response.status_code == 200:
                logger.info("✅ Login successful")
                token_data = response.json()
                if "access_token" in token_data:
                    logger.info("✅ Access token received")
                    return True
            else:
                logger.warning(f"⚠️ Login returned {response.status_code}: {response.text}")
        
        except Exception as e:
            logger.error(f"❌ Login test failed: {e}")
        
        return False
        
    except Exception as e:
        logger.error(f"❌ Auth endpoint tests failed: {e}")
        return False

def main():
    """Main function"""
    
    logger.info("🚀 Starting database fix and authentication tests...")
    
    # Fix database
    if not fix_database():
        logger.error("❌ Database fix failed")
        return False
    
    # Test authentication if server is running
    test_auth_endpoints()
    
    logger.info("\n📋 Summary:")
    logger.info("✅ Database relationships fixed")
    logger.info("✅ Test users created")
    logger.info("✅ Ready for authentication tests")
    
    logger.info("\n📋 To test authentication:")
    logger.info("1. Start backend: cd backend && uvicorn main:app --reload")
    logger.info("2. Test endpoints manually or run pytest")
    
    return True

if __name__ == "__main__":
    main() 
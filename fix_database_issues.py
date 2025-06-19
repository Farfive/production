#!/usr/bin/env python3
"""
Database Fix Script - Fix SQLAlchemy relationship mapping issues
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

def fix_database_relationships():
    """Fix database relationships and recreate schema"""
    
    try:
        # Import all dependencies
        from sqlalchemy import create_engine, text
        from sqlalchemy.orm import sessionmaker
        from app.core.database import Base, engine, SessionLocal
        
        # Import all models to ensure they're registered
        from app.models import (
            user, producer, order, quote, quote_template, 
            payment, invoice, supply_chain, product
        )
        
        logger.info("🔧 Starting database fix...")
        
        # Step 1: Drop existing database if it exists
        logger.info("📋 Step 1: Dropping existing database...")
        db_path = "./backend/manufacturing_platform.db"
        if os.path.exists(db_path):
            os.remove(db_path)
            logger.info("✅ Existing database removed")
        else:
            logger.info("ℹ️ No existing database found")
        
        # Step 2: Create new engine
        logger.info("📋 Step 2: Creating new database engine...")
        database_url = "sqlite:///./manufacturing_platform.db"
        engine = create_engine(
            database_url,
            echo=False,  # Reduce output noise
            future=True
        )
        
        # Step 3: Create all tables
        logger.info("📋 Step 3: Creating database tables...")
        Base.metadata.drop_all(bind=engine)  # Ensure clean slate
        Base.metadata.create_all(bind=engine)
        
        # Verify tables were created
        with engine.connect() as conn:
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table';"))
            tables = [row[0] for row in result.fetchall()]
            logger.info(f"✅ Created tables: {', '.join(tables)}")
        
        # Step 4: Create session and test relationships
        logger.info("📋 Step 4: Testing database relationships...")
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        try:
            # Test User model
            from app.models.user import User, UserRole, RegistrationStatus
            test_user = User(
                email="test@example.com",
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
            db.refresh(test_user)
            logger.info(f"✅ User model test successful: {test_user.id}")
            
            # Test Manufacturer model
            from app.models.producer import Manufacturer
            test_manufacturer = Manufacturer(
                user_id=test_user.id,
                business_name="Test Manufacturing Co",
                city="Warsaw",
                country="PL",
                capabilities={"processes": ["CNC Machining"], "materials": ["Aluminum"]},
                is_active=True,
                is_verified=True
            )
            db.add(test_manufacturer)
            db.commit()
            db.refresh(test_manufacturer)
            logger.info(f"✅ Manufacturer model test successful: {test_manufacturer.id}")
            
            # Test QuoteTemplate model
            from app.models.quote_template import QuoteTemplate
            test_template = QuoteTemplate(
                name="Standard CNC Quote",
                description="Standard template for CNC machining quotes",
                manufacturer_id=test_manufacturer.id,
                template_data={"labor_rate": 75.0, "markup": 1.2}
            )
            db.add(test_template)
            db.commit()
            db.refresh(test_template)
            logger.info(f"✅ QuoteTemplate model test successful: {test_template.id}")
            
            # Test relationships
            logger.info("📋 Testing relationships...")
            
            # Test User -> Manufacturer relationship
            user_with_manufacturer = db.query(User).filter(User.id == test_user.id).first()
            assert user_with_manufacturer.manufacturer_profile is not None
            logger.info("✅ User -> Manufacturer relationship working")
            
            # Test Manufacturer -> QuoteTemplate relationship
            manufacturer_with_templates = db.query(Manufacturer).filter(Manufacturer.id == test_manufacturer.id).first()
            assert len(manufacturer_with_templates.quote_templates) > 0
            logger.info("✅ Manufacturer -> QuoteTemplate relationship working")
            
            # Test QuoteTemplate -> Manufacturer relationship
            template_with_manufacturer = db.query(QuoteTemplate).filter(QuoteTemplate.id == test_template.id).first()
            assert template_with_manufacturer.manufacturer is not None
            logger.info("✅ QuoteTemplate -> Manufacturer relationship working")
            
            logger.info("🎉 All database relationships are working correctly!")
            
        except Exception as e:
            logger.error(f"❌ Relationship test failed: {e}")
            db.rollback()
            raise
        finally:
            db.close()
        
        # Step 5: Create test data for authentication tests
        logger.info("📋 Step 5: Creating test data for authentication tests...")
        
        db = SessionLocal()
        try:
            from app.core.security import get_password_hash
            
            # Create test users for authentication testing
            test_users = [
                {
                    "email": "test.client@example.com",
                    "password": "TestPassword123!",
                    "first_name": "Test",
                    "last_name": "Client",
                    "company_name": "Test Client Company",
                    "role": UserRole.CLIENT
                },
                {
                    "email": "test.manufacturer@example.com", 
                    "password": "TestPassword123!",
                    "first_name": "Test",
                    "last_name": "Manufacturer",
                    "company_name": "Test Manufacturing Inc",
                    "role": UserRole.MANUFACTURER
                },
                {
                    "email": "admin@example.com",
                    "password": "AdminPassword123!",
                    "first_name": "Admin",
                    "last_name": "User",
                    "company_name": "Platform Admin",
                    "role": UserRole.ADMIN
                }
            ]
            
            for user_data in test_users:
                # Check if user already exists
                existing_user = db.query(User).filter(User.email == user_data["email"]).first()
                if existing_user:
                    logger.info(f"User {user_data['email']} already exists, skipping")
                    continue
                
                user = User(
                    email=user_data["email"],
                    password_hash=get_password_hash(user_data["password"]),
                    first_name=user_data["first_name"],
                    last_name=user_data["last_name"],
                    company_name=user_data["company_name"],
                    role=user_data["role"],
                    registration_status=RegistrationStatus.ACTIVE,
                    is_active=True,
                    email_verified=True,
                    data_processing_consent=True,
                    marketing_consent=False
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                
                logger.info(f"✅ Created test user: {user.email} ({user.role.value})")
                
                # Create manufacturer profile for manufacturer users
                if user.role == UserRole.MANUFACTURER:
                    manufacturer = Manufacturer(
                        user_id=user.id,
                        business_name=user_data["company_name"],
                        city="Warsaw",
                        country="PL",
                        capabilities={
                            "manufacturing_processes": ["CNC Machining", "3D Printing"],
                            "materials": ["Steel", "Aluminum", "Plastic"],
                            "certifications": ["ISO 9001"]
                        },
                        is_active=True,
                        is_verified=True,
                        overall_rating=4.5
                    )
                    db.add(manufacturer)
                    db.commit()
                    logger.info(f"✅ Created manufacturer profile for: {user.email}")
            
        except Exception as e:
            logger.error(f"❌ Error creating test data: {e}")
            db.rollback()
            raise
        finally:
            db.close()
        
        logger.info("🎉 Database fix completed successfully!")
        logger.info("✅ All relationships are working")
        logger.info("✅ Test data created")
        logger.info("✅ Ready for authentication tests")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Database fix failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def verify_database_health():
    """Verify database is healthy and ready for tests"""
    
    try:
        from sqlalchemy import create_engine, text
        from sqlalchemy.orm import sessionmaker
        
        # Create engine
        database_url = "sqlite:///./manufacturing_platform.db"
        engine = create_engine(database_url)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        
        db = SessionLocal()
        
        try:
            # Test basic queries
            from app.models.user import User
            from app.models.producer import Manufacturer
            from app.models.quote_template import QuoteTemplate
            
            user_count = db.query(User).count()
            manufacturer_count = db.query(Manufacturer).count() 
            template_count = db.query(QuoteTemplate).count()
            
            logger.info("📊 Database Health Check:")
            logger.info(f"   Users: {user_count}")
            logger.info(f"   Manufacturers: {manufacturer_count}")
            logger.info(f"   Quote Templates: {template_count}")
            
            # Test relationship queries
            test_user = db.query(User).filter(User.role == "manufacturer").first()
            if test_user and test_user.manufacturer_profile:
                logger.info("✅ User -> Manufacturer relationship: OK")
                
                templates = test_user.manufacturer_profile.quote_templates
                logger.info(f"✅ Manufacturer -> QuoteTemplate relationship: OK ({len(templates)} templates)")
            
            logger.info("✅ Database health check passed!")
            return True
            
        except Exception as e:
            logger.error(f"❌ Database health check failed: {e}")
            return False
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        return False

if __name__ == "__main__":
    logger.info("🚀 Starting database fix process...")
    
    # Fix database issues
    if fix_database_relationships():
        # Verify database health
        if verify_database_health():
            logger.info("🎉 Database is ready for testing!")
            
            # Show next steps
            logger.info("\n📋 Next Steps:")
            logger.info("1. Run authentication tests:")
            logger.info("   cd backend && python -m pytest tests/test_auth.py -v")
            logger.info("2. Run database model tests:")
            logger.info("   cd backend && python -m pytest tests/database/test_models.py -v")
            logger.info("3. Start backend server:")
            logger.info("   cd backend && uvicorn main:app --reload")
            
        else:
            logger.error("❌ Database health check failed")
            sys.exit(1)
    else:
        logger.error("❌ Database fix failed")
        sys.exit(1) 
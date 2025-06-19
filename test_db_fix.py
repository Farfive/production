#!/usr/bin/env python3
"""
Simple Database Test and Fix
"""

import sys
import os
from pathlib import Path

# Add backend to sys.path
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

print("🔍 Testing database imports...")

try:
    # Test basic imports
    from sqlalchemy import create_engine
    print("✅ SQLAlchemy import OK")
    
    from app.core.database import Base
    print("✅ Database base import OK")
    
    # Test model imports one by one
    from app.models.user import User, UserRole, RegistrationStatus
    print("✅ User model import OK")
    
    from app.models.producer import Manufacturer
    print("✅ Manufacturer model import OK")
    
    from app.models.quote_template import QuoteTemplate
    print("✅ QuoteTemplate model import OK")
    
    from app.models.quote import Quote
    print("✅ Quote model import OK")
    
    # Test database creation
    print("\n🔧 Creating database...")
    
    # Remove old database
    db_path = "./backend/manufacturing_platform.db"
    if os.path.exists(db_path):
        os.remove(db_path)
        print("✅ Removed old database")
    
    # Create new database
    engine = create_engine("sqlite:///./manufacturing_platform.db", echo=False)
    Base.metadata.create_all(bind=engine)
    print("✅ Database created successfully")
    
    # Test basic operations
    from sqlalchemy.orm import sessionmaker
    from app.core.security import get_password_hash
    
    Session = sessionmaker(bind=engine)
    db = Session()
    
    # Create test user
    user = User(
        email="test@example.com",
        password_hash=get_password_hash("password123"),
        first_name="Test",
        last_name="User",
        role=UserRole.MANUFACTURER,
        registration_status=RegistrationStatus.ACTIVE,
        is_active=True,
        email_verified=True,
        data_processing_consent=True
    )
    db.add(user)
    db.commit()
    print(f"✅ Created user with ID: {user.id}")
    
    # Create manufacturer
    manufacturer = Manufacturer(
        user_id=user.id,
        business_name="Test Company",
        city="Warsaw",
        country="PL",
        is_active=True
    )
    db.add(manufacturer)
    db.commit()
    print(f"✅ Created manufacturer with ID: {manufacturer.id}")
    
    # Test relationships
    user_with_manufacturer = db.query(User).filter(User.id == user.id).first()
    if user_with_manufacturer.manufacturer_profile:
        print("✅ User -> Manufacturer relationship working")
    
    manufacturer_with_user = db.query(Manufacturer).filter(Manufacturer.id == manufacturer.id).first()
    if manufacturer_with_user.user:
        print("✅ Manufacturer -> User relationship working")
    
    db.close()
    
    print("\n🎉 Database is working correctly!")
    print("\n📋 Next steps:")
    print("1. Run authentication tests:")
    print("   cd backend && python -m pytest tests/test_auth.py -v")
    print("2. Start backend server:")
    print("   cd backend && uvicorn main:app --reload")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1) 
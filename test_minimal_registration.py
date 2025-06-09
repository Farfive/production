#!/usr/bin/env python3
"""
Minimal Registration Test - Direct Database Test
"""

import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

print("🔬 MINIMAL REGISTRATION TEST")
print("=" * 40)

try:
    print("📦 Importing dependencies...")
    from app.core.database import get_db, engine
    from app.models.user import User, UserRole, RegistrationStatus
    from app.core.security import get_password_hash
    from sqlalchemy.orm import sessionmaker
    from datetime import datetime
    
    print("✅ All imports successful")
    
    # Create database session
    print("\n🗄️  Creating database session...")
    Session = sessionmaker(bind=engine)
    db = Session()
    
    print("✅ Database session created")
    
    # Test 1: Check database connection
    print("\n🔍 Testing database connection...")
    try:
        user_count = db.query(User).count()
        print(f"✅ Database connection OK - Found {user_count} existing users")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        sys.exit(1)
    
    # Test 2: Create user manually
    print("\n👤 Creating user manually...")
    try:
        # Check if test user exists
        test_email = "manual_test@example.com"
        existing = db.query(User).filter(User.email == test_email).first()
        if existing:
            print(f"🗑️  Removing existing test user...")
            db.delete(existing)
            db.commit()
        
        # Create new user
        hashed_password = get_password_hash("TestPassword123!")
        new_user = User(
            email=test_email,
            password_hash=hashed_password,
            first_name="Manual",
            last_name="Test",
            role=UserRole.CLIENT,
            registration_status=RegistrationStatus.PENDING_EMAIL_VERIFICATION,
            company_name="Test Company",
            nip="1234567890",
            phone="+48123456789",
            company_address="Test Address",
            data_processing_consent=True,
            marketing_consent=False,
            consent_date=datetime.now()
        )
        
        print("💾 Adding user to database...")
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        print(f"✅ User created successfully!")
        print(f"   User ID: {new_user.id}")
        print(f"   Email: {new_user.email}")
        print(f"   Role: {new_user.role}")
        
    except Exception as e:
        print(f"❌ User creation failed: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    
    finally:
        db.close()
    
    print("\n" + "=" * 40)
    print("🏁 Manual test completed")
    
except Exception as e:
    print(f"❌ Import or setup error: {e}")
    import traceback
    traceback.print_exc() 
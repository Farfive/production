#!/usr/bin/env python3
"""
Simple authentication test to identify issues
"""

from app.core.database import SessionLocal, engine
from app.models.user import User, UserRole, RegistrationStatus
from app.core.security import get_password_hash, verify_password
from sqlalchemy.orm import Session
from datetime import datetime

def test_auth():
    db = SessionLocal()
    try:
        print("Testing database connection...")
        
        # Create a test user
        existing_user = db.query(User).filter(User.email == 'test@example.com').first()
        if not existing_user:
            test_user = User(
                email='test@example.com',
                password_hash=get_password_hash('test123'),
                first_name='Test',
                last_name='User',
                role=UserRole.CLIENT,
                registration_status=RegistrationStatus.ACTIVE,
                email_verified=True,
                is_active=True,
                data_processing_consent=True,
                consent_date=datetime.now()
            )
            db.add(test_user)
            db.commit()
            print('✓ Test user created successfully')
        else:
            print('✓ Test user already exists')
        
        # Test authentication
        user = db.query(User).filter(User.email == 'test@example.com').first()
        if user and verify_password('test123', user.password_hash):
            print('✓ Password verification working')
        else:
            print('✗ Password verification failed')
        
        print('✓ Database connection and user operations working')
        
    except Exception as e:
        print(f'✗ Error: {e}')
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_auth() 
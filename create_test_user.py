#!/usr/bin/env python3
import sys
import os
sys.path.append('backend')

from backend.app.models.user import User, UserRole
from backend.app.core.database import SessionLocal
from backend.app.core.security import create_access_token, get_password_hash

def create_test_user():
    """Create a test user and generate an authentication token"""
    db = SessionLocal()
    try:
        # Check if test user exists
        test_user = db.query(User).filter(User.email == 'test@example.com').first()
        if not test_user:
            # Create test user
            test_user = User(
                email='test@example.com',
                hashed_password=get_password_hash('testpassword123'),
                first_name='Test',
                last_name='User',
                role=UserRole.CLIENT,
                is_verified=True,
                is_active=True
            )
            db.add(test_user)
            db.commit()
            db.refresh(test_user)
            print(f"Created test user with ID: {test_user.id}")
        else:
            print(f"Test user already exists with ID: {test_user.id}")

        # Generate authentication token
        token = create_access_token(subject=test_user.email)
        print(f"Authentication token: {token}")
        
        return test_user.id, token
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
        return None, None
    finally:
        db.close()

if __name__ == "__main__":
    create_test_user() 
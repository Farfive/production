#!/usr/bin/env python3
"""
Activate Test User Script
Manually activates test users for authentication testing
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy.orm import Session
from app.core.database import get_db, engine
from app.models.user import User, RegistrationStatus

def activate_user_by_email(email: str):
    """Activate a user by email for testing purposes"""
    
    # Create session
    db = Session(engine)
    
    try:
        # Find user
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            print(f"❌ User not found: {email}")
            return False
        
        print(f"📧 Found user: {user.email}")
        print(f"   Current status: {user.registration_status}")
        print(f"   Email verified: {user.email_verified}")
        print(f"   Is active: {user.is_active}")
        
        # Activate user
        user.email_verified = True
        user.registration_status = RegistrationStatus.ACTIVE
        user.is_active = True
        
        db.commit()
        db.refresh(user)
        
        print(f"✅ User activated successfully!")
        print(f"   New status: {user.registration_status}")
        print(f"   Email verified: {user.email_verified}")
        print(f"   Is active: {user.is_active}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error activating user: {e}")
        db.rollback()
        return False
        
    finally:
        db.close()

def activate_latest_test_user():
    """Activate the most recently created test user"""
    
    db = Session(engine)
    
    try:
        # Find latest test user
        user = db.query(User).filter(
            User.email.like('%@example.com')
        ).order_by(User.created_at.desc()).first()
        
        if not user:
            print("❌ No test users found")
            return False
        
        print(f"🔍 Latest test user: {user.email}")
        return activate_user_by_email(user.email)
        
    except Exception as e:
        print(f"❌ Error finding latest user: {e}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    print("🔧 USER ACTIVATION SCRIPT")
    print("=" * 40)
    
    if len(sys.argv) > 1:
        email = sys.argv[1]
        activate_user_by_email(email)
    else:
        activate_latest_test_user() 
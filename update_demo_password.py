#!/usr/bin/env python3
"""Update demo user password"""

import sys
sys.path.append('backend')

from app.core.database import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash

def update_password():
    db = SessionLocal()
    try:
        # Update client user password
        user = db.query(User).filter(User.email == "client@demo.com").first()
        if user:
            new_password = "test123"
            new_hash = get_password_hash(new_password)
            
            print(f"Updating password for {user.email}")
            print(f"New password: {new_password}")
            print(f"New hash: {new_hash[:50]}...")
            
            user.password_hash = new_hash
            db.commit()
            
            print("✅ Password updated successfully!")
        else:
            print("❌ User not found!")
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    update_password() 
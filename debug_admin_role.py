#!/usr/bin/env python3
"""Debug script to check admin role and order creation"""

import sys
import os
sys.path.append('backend')

from backend.app.core.database import get_db
from backend.app.models.user import User, UserRole

def debug_admin_role():
    """Debug admin role comparison"""
    db = next(get_db())
    try:
        # Get admin user
        admin_user = db.query(User).filter(User.email == 'test.admin@example.com').first()
        
        if not admin_user:
            print("❌ Admin user not found!")
            return
        
        print(f"✅ Admin user found: {admin_user.email}")
        print(f"   Role: {admin_user.role}")
        print(f"   Role type: {type(admin_user.role)}")
        print(f"   UserRole.ADMIN: {UserRole.ADMIN}")
        print(f"   UserRole.ADMIN type: {type(UserRole.ADMIN)}")
        print(f"   Role == UserRole.ADMIN: {admin_user.role == UserRole.ADMIN}")
        print(f"   Role in [CLIENT, ADMIN]: {admin_user.role in [UserRole.CLIENT, UserRole.ADMIN]}")
        
        if hasattr(admin_user.role, 'value'):
            print(f"   Role value: {admin_user.role.value}")
        
        # Test all users
        print("\n📋 All users:")
        all_users = db.query(User).all()
        for user in all_users:
            print(f"   {user.email}: {user.role} (type: {type(user.role)})")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    debug_admin_role() 
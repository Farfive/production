#!/usr/bin/env python3
"""Check users in database"""

import sys
sys.path.append('backend')

from app.core.database import SessionLocal
from app.models.user import User

def check_users():
    db = SessionLocal()
    try:
        # Check if users exist
        users = db.query(User).all()
        print(f'Found {len(users)} users in database:')
        for user in users:
            print(f'  - {user.email} ({user.role.value}) - Active: {user.is_active} - Status: {user.registration_status.value}')
        
        if len(users) == 0:
            print('No users found. Database is empty.')
        
        return users
    finally:
        db.close()

if __name__ == "__main__":
    check_users() 
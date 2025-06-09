#!/usr/bin/env python3
import sys, os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from sqlalchemy.orm import Session
from app.core.database import engine
from app.models.user import User

db = Session(engine)
users = db.query(User).all()
print('📋 All users in database:')
for user in users:
    print(f'  - {user.email} (ID: {user.id}, Status: {user.registration_status}, Verified: {user.email_verified})')
db.close() 
#!/usr/bin/env python3
"""
Simple direct authentication test bypassing complex relationships
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.security import get_password_hash, verify_password
from app.core.config import settings

def test_direct_auth():
    # Create direct database connection
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    db = SessionLocal()
    try:
        print("Testing direct database connection...")
        
        # Test basic connection
        result = db.execute(text("SELECT 1")).fetchone()
        print(f"✓ Database connection OK: {result}")
        
        # Check if users table exists
        result = db.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")).fetchone()
        if result:
            print("✓ Users table exists")
        else:
            print("✗ Users table does not exist")
            return
        
        # Check if test user exists
        result = db.execute(text("SELECT id, email, password_hash FROM users WHERE email = 'test@example.com'")).fetchone()
        if result:
            print(f"✓ Test user exists: {result.email}")
            # Test password verification
            if verify_password('test123', result.password_hash):
                print("✓ Password verification successful")
            else:
                print("✗ Password verification failed")
        else:
            print("Creating test user...")
            # Create test user directly
            hashed_password = get_password_hash('test123')
            db.execute(text("""
                INSERT INTO users (email, password_hash, first_name, last_name, role, registration_status, email_verified, is_active, data_processing_consent, created_at, updated_at)
                VALUES ('test@example.com', :password_hash, 'Test', 'User', 'client', 'active', 1, 1, 1, datetime('now'), datetime('now'))
            """), {"password_hash": hashed_password})
            db.commit()
            print("✓ Test user created")
        
        print("✓ Direct authentication test completed successfully")
        
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_direct_auth() 
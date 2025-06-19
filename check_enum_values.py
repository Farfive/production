#!/usr/bin/env python3
"""Check enum values in database"""

import sys
sys.path.append('backend')

from app.core.database import SessionLocal
from sqlalchemy import text

def check_enum_values():
    db = SessionLocal()
    try:
        # Check the actual values stored in the database
        result = db.execute(text("SELECT email, role, registration_status FROM users WHERE email LIKE '%demo.com'"))
        rows = result.fetchall()
        
        print("Raw database values:")
        for row in rows:
            print(f"  Email: {row[0]}")
            print(f"  Role: {row[1]} (type: {type(row[1])})")
            print(f"  Registration Status: {row[2]} (type: {type(row[2])})")
            print()
        
        # Check the schema
        result = db.execute(text("PRAGMA table_info(users)"))
        columns = result.fetchall()
        
        print("Table schema:")
        for col in columns:
            if col[1] in ['role', 'registration_status']:
                print(f"  {col[1]}: {col[2]}")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    check_enum_values() 
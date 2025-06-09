"""
Script to activate test users for testing purposes
"""

import sqlite3
import sys

def activate_users():
    """Activate all test users in the database"""
    try:
        # Connect to the SQLite database
        conn = sqlite3.connect('backend/manufacturing_platform.db')
        cursor = conn.cursor()
        
        # Update all test users to be active and email verified
        cursor.execute("""
            UPDATE users 
            SET is_active = 1, 
                email_verified = 1,
                registration_status = 'ACTIVE'
            WHERE email LIKE 'test_%'
        """)
        
        affected_rows = cursor.rowcount
        
        # Commit the changes
        conn.commit()
        
        print(f"✅ Successfully activated {affected_rows} test users")
        
        # Show the updated users
        cursor.execute("""
            SELECT id, email, role, is_active, email_verified, registration_status 
            FROM users 
            WHERE email LIKE 'test_%'
            ORDER BY created_at DESC
            LIMIT 10
        """)
        
        users = cursor.fetchall()
        if users:
            print("\nActivated users:")
            for user in users:
                print(f"  ID: {user[0]}, Email: {user[1]}, Role: {user[2]}, Active: {user[3]}, Verified: {user[4]}, Status: {user[5]}")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Error activating users: {e}")
        return False

if __name__ == "__main__":
    success = activate_users()
    sys.exit(0 if success else 1) 
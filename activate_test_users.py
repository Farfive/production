#!/usr/bin/env python3
"""
Activate Test Users - Fix the inactive user account issue
"""

import sqlite3
from datetime import datetime

def activate_users():
    print("🔧 ACTIVATING TEST USERS")
    print("="*40)
    
    try:
        # Connect to the database
        conn = sqlite3.connect('manufacturing_platform.db')
        cursor = conn.cursor()
        
        # Get all inactive users
        cursor.execute("SELECT id, email, is_active FROM users WHERE is_active = 0")
        inactive_users = cursor.fetchall()
        
        print(f"Found {len(inactive_users)} inactive users:")
        for user_id, email, is_active in inactive_users:
            print(f"   • User ID {user_id}: {email}")
        
        # Activate all users
        cursor.execute("""
            UPDATE users 
            SET is_active = 1, 
                registration_status = 'completed',
                email_verified = 1,
                updated_at = ?
            WHERE is_active = 0
        """, (datetime.now().isoformat(),))
        
        activated_count = cursor.rowcount
        conn.commit()
        
        print(f"\n✅ Activated {activated_count} users successfully!")
        
        # Verify activation
        cursor.execute("SELECT id, email, is_active FROM users WHERE is_active = 1")
        active_users = cursor.fetchall()
        
        print(f"\nActive users now:")
        for user_id, email, is_active in active_users:
            print(f"   ✅ User ID {user_id}: {email}")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Error activating users: {e}")
        return False

def main():
    print("🚀 USER ACTIVATION SCRIPT")
    print("="*40)
    
    if activate_users():
        print("\n🎉 All users activated successfully!")
        print("You can now run the test again with: python run_test_now.py")
    else:
        print("\n❌ Failed to activate users")

if __name__ == "__main__":
    main() 
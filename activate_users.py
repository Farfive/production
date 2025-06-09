#!/usr/bin/env python3
"""
Activate Users for Testing
"""
import sqlite3
import os

def activate_recent_users():
    db_path = 'backend/manufacturing_platform.db'
    
    if not os.path.exists(db_path):
        print(f"❌ Database not found: {db_path}")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get recent unverified users
        cursor.execute('''
            SELECT id, email, email_verified, is_active, registration_status 
            FROM users 
            WHERE email_verified = 0 OR registration_status = 'pending_email_verification'
            ORDER BY id DESC 
            LIMIT 10
        ''')
        
        users = cursor.fetchall()
        print(f"Found {len(users)} users to activate:")
        
        for user in users:
            print(f"  ID: {user[0]}, Email: {user[1]}")
        
        if users:
            # Activate all recent users
            user_ids = [str(user[0]) for user in users]
            placeholders = ','.join(['?' for _ in user_ids])
            
            cursor.execute(f'''
                UPDATE users 
                SET email_verified = 1, 
                    is_active = 1, 
                    registration_status = 'active'
                WHERE id IN ({placeholders})
            ''', user_ids)
            
            conn.commit()
            print(f"✅ Activated {cursor.rowcount} users")
            
            # Verify changes
            cursor.execute('''
                SELECT id, email, email_verified, is_active, registration_status 
                FROM users 
                WHERE id IN ({})
            '''.format(placeholders), user_ids)
            
            updated_users = cursor.fetchall()
            print("\nUpdated users:")
            for user in updated_users:
                print(f"  ID: {user[0]}, Email: {user[1]}, Verified: {user[2]}, Active: {user[3]}, Status: {user[4]}")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Database error: {e}")

if __name__ == "__main__":
    activate_recent_users() 
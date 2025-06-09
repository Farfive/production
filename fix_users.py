import sqlite3
import os

try:
    db_path = os.path.join('backend', 'manufacturing_platform.db')
    print(f"Looking for database at: {db_path}")
    
    if os.path.exists(db_path):
        print("Database found! Connecting...")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check current users
        cursor.execute('SELECT COUNT(*) FROM users WHERE email_verified = 0')
        unverified_count = cursor.fetchone()[0]
        print(f"Found {unverified_count} unverified users")
        
        # Activate users
        cursor.execute('''
            UPDATE users 
            SET email_verified = 1, 
                is_active = 1, 
                registration_status = 'active'
            WHERE email_verified = 0
        ''')
        
        activated_count = cursor.rowcount
        conn.commit()
        conn.close()
        
        print(f"✅ Successfully activated {activated_count} users!")
        
    else:
        print(f"❌ Database file not found at: {db_path}")
        print("Current directory contents:")
        print(os.listdir('.'))
        
except Exception as e:
    print(f"❌ Error: {e}") 
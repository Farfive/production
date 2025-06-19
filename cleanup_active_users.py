#!/usr/bin/env python3
"""
CLEANUP ACTIVE USERS SCRIPT
Comprehensive script to clean active users from database and prepare for fresh webapp run
"""

import sqlite3
import os
import sys
from datetime import datetime

def cleanup_database(db_path, db_name):
    """Clean active users and sessions from a specific database"""
    if not os.path.exists(db_path):
        print(f"⚠️  Database not found: {db_path}")
        return False
    
    print(f"\n🔧 CLEANING DATABASE: {db_name}")
    print("=" * 50)
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get current user count
        cursor.execute("SELECT COUNT(*) FROM users")
        total_users = cursor.fetchone()[0]
        print(f"📊 Found {total_users} users in database")
        
        # Clear all session-related tables
        session_tables = [
            "user_sessions", 
            "refresh_tokens", 
            "access_tokens", 
            "api_keys",
            "login_sessions",
            "active_sessions"
        ]
        
        cleared_tables = 0
        for table in session_tables:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                if count > 0:
                    cursor.execute(f"DELETE FROM {table}")
                    print(f"   ✅ Cleared {count} records from {table}")
                    cleared_tables += 1
                else:
                    print(f"   ✅ {table} already empty")
            except sqlite3.OperationalError:
                print(f"   ⚠️  Table {table} not found (OK)")
        
        # Update all users to logged out state
        cursor.execute("""
            UPDATE users 
            SET last_login = NULL,
                updated_at = ?
        """, (datetime.now().isoformat(),))
        
        logged_out_count = cursor.rowcount
        
        # Reset any active status flags
        try:
            cursor.execute("""
                UPDATE users 
                SET is_online = 0
                WHERE is_online = 1
            """)
            online_reset = cursor.rowcount
            if online_reset > 0:
                print(f"   ✅ Reset {online_reset} online users to offline")
        except sqlite3.OperationalError:
            pass  # Column doesn't exist
        
        conn.commit()
        conn.close()
        
        print(f"   ✅ Logged out {logged_out_count} users")
        print(f"   ✅ Cleared {cleared_tables} session tables")
        print(f"   🎉 Database {db_name} cleaned successfully!")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Error cleaning {db_name}: {e}")
        return False

def main():
    """Main cleanup function"""
    print("=" * 60)
    print("🧹 ACTIVE USERS CLEANUP SCRIPT")
    print("=" * 60)
    print("This script will:")
    print("• Clear all active user sessions")
    print("• Log out all users")
    print("• Clear authentication tokens")
    print("• Reset online status")
    print("=" * 60)
    
    # Database paths to check
    databases = [
        ("manufacturing_platform.db", "Root Database"),
        ("backend/manufacturing_platform.db", "Backend Database"),
        ("backend/test.db", "Test Database")
    ]
    
    cleaned_count = 0
    
    for db_path, db_name in databases:
        if cleanup_database(db_path, db_name):
            cleaned_count += 1
    
    print(f"\n🎉 CLEANUP COMPLETE!")
    print(f"✅ Successfully cleaned {cleaned_count} databases")
    print("\n📋 Next Steps:")
    print("1. Start the backend server: cd backend && python main.py")
    print("2. Start the frontend: cd frontend && npm start")
    print("3. Access the app at: http://localhost:3000")
    print("4. All users are now logged out - you can register/login fresh")
    
    return cleaned_count > 0

if __name__ == "__main__":
    success = main()
    if success:
        print(f"\n✅ Cleanup completed successfully!")
        sys.exit(0)
    else:
        print(f"\n❌ Cleanup failed!")
        sys.exit(1) 
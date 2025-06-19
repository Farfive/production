#!/usr/bin/env python3
"""
Database migration script to add Firebase UID column to users table
This is a simple migration for development purposes
"""

import sqlite3
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def add_firebase_uid_column():
    """Add firebase_uid column to users table if it doesn't exist"""
    
    db_path = Path("manufacturing_platform.db")
    if not db_path.exists():
        logger.error("Database file not found!")
        return False
    
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Check if firebase_uid column already exists
        cursor.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'firebase_uid' in columns:
            logger.info("✅ firebase_uid column already exists")
            return True
        
        # Add firebase_uid column
        logger.info("🔧 Adding firebase_uid column to users table...")
        cursor.execute("""
            ALTER TABLE users 
            ADD COLUMN firebase_uid VARCHAR(128) UNIQUE
        """)
        
        # Create index for firebase_uid
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_users_firebase_uid 
            ON users(firebase_uid)
        """)
        
        # Make password_hash nullable (for Firebase users)
        # Note: SQLite doesn't support ALTER COLUMN, so this would require table recreation
        # For now, we'll just add the firebase_uid column
        
        conn.commit()
        logger.info("✅ Successfully added firebase_uid column and index")
        
        # Verify the change
        cursor.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'firebase_uid' in columns:
            logger.info("✅ Migration completed successfully")
            return True
        else:
            logger.error("❌ Migration failed - column not found after addition")
            return False
            
    except sqlite3.Error as e:
        logger.error(f"❌ Database error: {e}")
        return False
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}")
        return False
    finally:
        if conn:
            conn.close()

def main():
    """Main migration function"""
    logger.info("🔥 Starting Firebase UID migration...")
    
    success = add_firebase_uid_column()
    
    if success:
        logger.info("🎉 Firebase UID migration completed successfully!")
        logger.info("📋 Next steps:")
        logger.info("  1. Restart your backend server")
        logger.info("  2. Test Firebase authentication endpoints")
        logger.info("  3. Migrate existing users to Firebase")
    else:
        logger.error("💥 Migration failed!")
        
    return success

if __name__ == "__main__":
    main() 
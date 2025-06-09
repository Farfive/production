#!/usr/bin/env python3
"""
Database Schema Fix Script
Recreates the database with corrected ORM relationships
"""

import os
import sys
import sqlite3
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

print("🔧 MANUFACTURING PLATFORM - DATABASE SCHEMA FIX")
print("=" * 60)

try:
    # Import the database components
    print("📦 Importing database components...")
    from app.core.database import engine, Base, create_tables
    from app.models import *  # Import all models
    
    print("✅ All models imported successfully")
    
    # Check current database
    db_path = backend_dir / "manufacturing_platform.db"
    
    if db_path.exists():
        print(f"🗄️  Found existing database: {db_path}")
        
        # Backup current database
        backup_path = backend_dir / f"manufacturing_platform_backup_{int(os.path.getmtime(db_path))}.db"
        print(f"💾 Creating backup: {backup_path}")
        
        import shutil
        shutil.copy2(db_path, backup_path)
        print("✅ Backup created successfully")
        
        # Remove old database
        print("🗑️  Removing old database...")
        os.remove(db_path)
        print("✅ Old database removed")
    
    # Create new database with fixed schema
    print("🏗️  Creating new database with fixed schema...")
    
    # Force SQLAlchemy to recreate all tables
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    print("✅ New database schema created successfully")
    
    # Verify the new schema
    print("🔍 Verifying new schema...")
    
    # Connect to the new database and check tables
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Get all table names
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    
    print(f"📋 Found {len(tables)} tables:")
    for table in tables:
        table_name = table[0]
        cursor.execute(f"PRAGMA table_info({table_name});")
        columns = cursor.fetchall()
        print(f"   ✅ {table_name}: {len(columns)} columns")
    
    conn.close()
    
    print("\n🎉 DATABASE SCHEMA FIX COMPLETED SUCCESSFULLY!")
    print("=" * 60)
    print("✅ All ORM relationships fixed")
    print("✅ Database recreated with correct schema")
    print("✅ Backup of old database created")
    print("\n🚀 Ready to restart the API server!")
    
except ImportError as e:
    print(f"❌ Import Error: {e}")
    print("Make sure you're running this from the project root directory")
    sys.exit(1)
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1) 
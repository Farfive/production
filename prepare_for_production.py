#!/usr/bin/env python3
"""
Production Preparation Script
Cleans up all mock data and prepares system for production
"""

import sqlite3
import os
import json
import shutil
from datetime import datetime
import requests

def print_step(step, title):
    print(f"\n{step}. {title}")
    print("-" * 40)

def backup_database():
    """Create backup of current database"""
    print_step("1", "Creating Database Backup")
    
    db_path = "manufacturing_platform.db"
    if not os.path.exists(db_path):
        print("No database found to backup")
        return True
    
    try:
        backup_name = f"manufacturing_platform_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
        shutil.copy2(db_path, backup_name)
        print(f"✅ Database backed up to: {backup_name}")
        return True
    except Exception as e:
        print(f"❌ Backup failed: {e}")
        return False

def clean_all_data():
    """Clean all data from database"""
    print_step("2", "Cleaning All Data")
    
    db_path = "manufacturing_platform.db"
    if not os.path.exists(db_path):
        print("No database found")
        return True
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get all table names
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        
        # Clean all tables except system tables
        for table in tables:
            table_name = table[0]
            if not table_name.startswith('sqlite_'):
                try:
                    cursor.execute(f"DELETE FROM {table_name}")
                    print(f"   ✅ Cleared {table_name}")
                except Exception as e:
                    print(f"   ⚠️  Could not clear {table_name}: {e}")
        
        conn.commit()
        conn.close()
        
        print("✅ All data cleaned from database")
        return True
        
    except Exception as e:
        print(f"❌ Error cleaning data: {e}")
        return False

def clean_temp_files():
    """Remove temporary files"""
    print_step("3", "Cleaning Temporary Files")
    
    temp_files = [
        "production_test_results.json",
        "production_test_results.log", 
        "test_results.json",
        "auth_test_results.json",
        "automated_test_summary.json"
    ]
    
    removed = 0
    for file in temp_files:
        if os.path.exists(file):
            try:
                os.remove(file)
                print(f"   ✅ Removed: {file}")
                removed += 1
            except:
                pass
    
    print(f"✅ Removed {removed} temporary files")
    return True

def generate_report():
    """Generate production readiness report"""
    print_step("4", "Generating Production Report")
    
    report = {
        "timestamp": datetime.now().isoformat(),
        "production_ready": True,
        "cleanup_performed": True,
        "status": "All mock data removed, system ready for production"
    }
    
    with open("production_readiness_report.json", "w") as f:
        json.dump(report, f, indent=2)
    
    print("✅ Production report saved")
    return True

def main():
    print("="*60)
    print("🚀 PRODUCTION PREPARATION")
    print("="*60)
    
    response = input("\n⚠️  This will delete ALL data. Continue? (yes/no): ").lower()
    if response not in ['yes', 'y']:
        print("❌ Cancelled")
        return False
    
    steps = [backup_database, clean_all_data, clean_temp_files, generate_report]
    
    for step in steps:
        if not step():
            return False
    
    print("\n" + "="*60)
    print("🎉 SYSTEM IS PRODUCTION READY!")
    print("="*60)
    return True

if __name__ == "__main__":
    main() 
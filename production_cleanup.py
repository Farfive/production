#!/usr/bin/env python3
"""
Production Cleanup Script
Logs out all users, deletes mock data, prepares for production
"""

import sqlite3
import os
import json
import shutil
from datetime import datetime
import requests

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    YELLOW = '\033[93m'
    PURPLE = '\033[95m'
    CYAN = '\033[96m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_step(step, title):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{step}. {title}{Colors.END}")
    print("-" * 50)

def backup_database():
    """Create backup of current database"""
    print_step("1", "CREATING DATABASE BACKUP")
    
    db_path = "manufacturing_platform.db"
    if not os.path.exists(db_path):
        print(f"{Colors.YELLOW}⚠️  No database found to backup{Colors.END}")
        return True
    
    try:
        backup_name = f"manufacturing_platform_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
        shutil.copy2(db_path, backup_name)
        print(f"{Colors.GREEN}✅ Database backed up to: {backup_name}{Colors.END}")
        return True
    except Exception as e:
        print(f"{Colors.RED}❌ Backup failed: {e}{Colors.END}")
        return False

def log_out_all_users():
    """Log out all active users"""
    print_step("2", "LOGGING OUT ALL ACTIVE USERS")
    
    try:
        # Try API logout first
        try:
            response = requests.post("http://localhost:8000/api/v1/auth/logout-all", timeout=5)
            if response.status_code == 200:
                print(f"{Colors.GREEN}✅ All users logged out via API{Colors.END}")
                return True
        except:
            print(f"{Colors.YELLOW}⚠️  API logout failed, cleaning database directly{Colors.END}")
        
        # Clean database directly
        db_path = "manufacturing_platform.db"
        if os.path.exists(db_path):
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Clear sessions and tokens
            session_tables = ["user_sessions", "refresh_tokens", "access_tokens", "api_keys"]
            
            for table in session_tables:
                try:
                    cursor.execute(f"DELETE FROM {table}")
                    print(f"{Colors.GREEN}   ✅ Cleared {table}{Colors.END}")
                except sqlite3.OperationalError:
                    pass  # Table doesn't exist
            
            # Update users to logged out state
            cursor.execute("""
                UPDATE users 
                SET last_login = NULL,
                    updated_at = ?
            """, (datetime.now().isoformat(),))
            
            logged_out_count = cursor.rowcount
            conn.commit()
            conn.close()
            
            print(f"{Colors.GREEN}✅ Logged out {logged_out_count} users from database{Colors.END}")
        
        return True
        
    except Exception as e:
        print(f"{Colors.RED}❌ Error logging out users: {e}{Colors.END}")
        return False

def clean_all_data():
    """Remove ALL data from database"""
    print_step("3", "CLEANING ALL DATA FROM DATABASE")
    
    db_path = "manufacturing_platform.db"
    if not os.path.exists(db_path):
        print(f"{Colors.YELLOW}⚠️  No database found{Colors.END}")
        return True
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get all table names
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        
        total_deleted = 0
        
        # Clean all tables except system tables
        for table in tables:
            table_name = table[0]
            if not table_name.startswith('sqlite_'):
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                    count_before = cursor.fetchone()[0]
                    
                    cursor.execute(f"DELETE FROM {table_name}")
                    deleted = cursor.rowcount
                    total_deleted += deleted
                    
                    if deleted > 0:
                        print(f"{Colors.GREEN}   ✅ Cleared {table_name}: {deleted} records{Colors.END}")
                    
                except Exception as e:
                    print(f"{Colors.YELLOW}   ⚠️  Could not clear {table_name}: {e}{Colors.END}")
        
        conn.commit()
        conn.close()
        
        print(f"{Colors.GREEN}✅ Total records deleted: {total_deleted}{Colors.END}")
        return True
        
    except Exception as e:
        print(f"{Colors.RED}❌ Error cleaning data: {e}{Colors.END}")
        return False

def clean_temporary_files():
    """Remove temporary and test files"""
    print_step("4", "CLEANING TEMPORARY FILES")
    
    temp_files = [
        "production_test_results.json",
        "production_test_results.log", 
        "test_results.json",
        "auth_test_results.json",
        "auth_test_report.json",
        "automated_test_summary.json",
        "production_test.log",
        "quick_test_results.json"
    ]
    
    removed_count = 0
    
    for file in temp_files:
        if os.path.exists(file):
            try:
                os.remove(file)
                print(f"{Colors.GREEN}   ✅ Removed: {file}{Colors.END}")
                removed_count += 1
            except Exception as e:
                print(f"{Colors.YELLOW}   ⚠️  Could not remove {file}: {e}{Colors.END}")
    
    # Remove __pycache__ directories
    for root, dirs, files in os.walk("."):
        if "__pycache__" in dirs:
            try:
                shutil.rmtree(os.path.join(root, "__pycache__"))
                print(f"{Colors.GREEN}   ✅ Removed: {os.path.join(root, '__pycache__')}{Colors.END}")
                removed_count += 1
            except:
                pass
    
    print(f"{Colors.GREEN}✅ Removed {removed_count} temporary files/directories{Colors.END}")
    return True

def reset_database_sequences():
    """Reset database auto-increment sequences"""
    print_step("5", "RESETTING DATABASE SEQUENCES")
    
    try:
        db_path = "manufacturing_platform.db"
        if os.path.exists(db_path):
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Reset SQLite sequence for all tables
            cursor.execute("DELETE FROM sqlite_sequence")
            
            conn.commit()
            conn.close()
            
            print(f"{Colors.GREEN}✅ Database sequences reset{Colors.END}")
        
        return True
        
    except Exception as e:
        print(f"{Colors.RED}❌ Error resetting sequences: {e}{Colors.END}")
        return False

def generate_production_report():
    """Generate production readiness report"""
    print_step("6", "GENERATING PRODUCTION REPORT")
    
    try:
        report = {
            "timestamp": datetime.now().isoformat(),
            "production_ready": True,
            "cleanup_performed": True,
            "actions_completed": [
                "Database backed up",
                "All users logged out",
                "All data deleted",
                "Temporary files cleaned",
                "Database sequences reset"
            ],
            "database_stats": {},
            "next_steps": [
                "Configure production environment variables",
                "Set up production database (PostgreSQL recommended)",
                "Configure production secrets and API keys",
                "Set up monitoring and logging",
                "Deploy to production environment"
            ]
        }
        
        # Get current database stats
        db_path = "manufacturing_platform.db"
        if os.path.exists(db_path):
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            tables = ["users", "manufacturers", "orders", "quotes", "transactions"]
            
            for table in tables:
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM {table}")
                    count = cursor.fetchone()[0]
                    report["database_stats"][table] = count
                except sqlite3.OperationalError:
                    report["database_stats"][table] = "table not found"
            
            conn.close()
        
        # Save report
        with open("production_readiness_report.json", "w") as f:
            json.dump(report, f, indent=2)
        
        print(f"{Colors.GREEN}✅ Production report saved to: production_readiness_report.json{Colors.END}")
        
        # Display summary
        print(f"\n{Colors.CYAN}📊 Database Status After Cleanup:{Colors.END}")
        for table, count in report["database_stats"].items():
            print(f"{Colors.CYAN}   {table}: {count} records{Colors.END}")
        
        return True
        
    except Exception as e:
        print(f"{Colors.RED}❌ Error generating report: {e}{Colors.END}")
        return False

def main():
    """Main execution function"""
    print(f"{Colors.BOLD}{Colors.PURPLE}{'='*60}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.PURPLE}🚀 PRODUCTION CLEANUP & PREPARATION{Colors.END}")
    print(f"{Colors.BOLD}{Colors.PURPLE}{'='*60}{Colors.END}")
    
    print(f"\n{Colors.YELLOW}This script will:{Colors.END}")
    print(f"{Colors.YELLOW}• Create database backup{Colors.END}")
    print(f"{Colors.YELLOW}• Log out all active users{Colors.END}")
    print(f"{Colors.YELLOW}• Delete ALL data from database{Colors.END}")
    print(f"{Colors.YELLOW}• Clean temporary files{Colors.END}")
    print(f"{Colors.YELLOW}• Reset database sequences{Colors.END}")
    print(f"{Colors.YELLOW}• Generate production report{Colors.END}")
    
    # Confirmation
    response = input(f"\n{Colors.RED}⚠️  This will DELETE ALL DATA. Continue? (yes/no): {Colors.END}").lower().strip()
    if response not in ['yes', 'y']:
        print(f"{Colors.RED}❌ Production cleanup cancelled{Colors.END}")
        return False
    
    start_time = datetime.now()
    
    # Execute cleanup steps
    steps = [
        backup_database,
        log_out_all_users,
        clean_all_data,
        clean_temporary_files,
        reset_database_sequences,
        generate_production_report
    ]
    
    results = []
    
    for step_func in steps:
        result = step_func()
        results.append(result)
    
    # Final summary
    end_time = datetime.now()
    duration = end_time - start_time
    
    print(f"\n{Colors.BOLD}{Colors.PURPLE}{'='*60}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.PURPLE}📊 CLEANUP SUMMARY{Colors.END}")
    print(f"{Colors.BOLD}{Colors.PURPLE}{'='*60}{Colors.END}")
    
    step_names = [
        "Database Backup",
        "User Logout", 
        "Data Cleanup",
        "File Cleanup",
        "Sequence Reset",
        "Report Generation"
    ]
    
    for i, (step_name, success) in enumerate(zip(step_names, results)):
        status = f"{Colors.GREEN}✅ COMPLETED{Colors.END}" if success else f"{Colors.RED}❌ FAILED{Colors.END}"
        print(f"{step_name}: {status}")
    
    overall_success = all(results)
    success_rate = (sum(results) / len(results)) * 100
    
    print(f"\n{Colors.CYAN}🎯 Overall Success Rate: {success_rate:.1f}%{Colors.END}")
    print(f"{Colors.CYAN}⏱️  Total Time: {duration}{Colors.END}")
    
    if overall_success:
        print(f"\n{Colors.GREEN}{Colors.BOLD}🎉 SYSTEM IS CLEAN AND PRODUCTION READY!{Colors.END}")
        print(f"\n{Colors.CYAN}📋 Next Steps:{Colors.END}")
        print(f"{Colors.CYAN}   1. Review production_readiness_report.json{Colors.END}")
        print(f"{Colors.CYAN}   2. Configure production environment variables{Colors.END}")
        print(f"{Colors.CYAN}   3. Set up production database (PostgreSQL){Colors.END}")
        print(f"{Colors.CYAN}   4. Configure production secrets and API keys{Colors.END}")
        print(f"{Colors.CYAN}   5. Deploy to production environment{Colors.END}")
    else:
        print(f"\n{Colors.YELLOW}⚠️  CLEANUP COMPLETED WITH SOME ISSUES{Colors.END}")
        print(f"{Colors.YELLOW}   Please review the errors above{Colors.END}")
    
    return overall_success

if __name__ == "__main__":
    try:
        success = main()
        exit(0 if success else 1)
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}⚠️  Cleanup interrupted by user{Colors.END}")
        exit(1)
    except Exception as e:
        print(f"\n\n{Colors.RED}❌ Unexpected error: {e}{Colors.END}")
        exit(1) 
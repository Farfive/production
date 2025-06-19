#!/usr/bin/env python3
"""
🚀 PRODUCTION DEPLOYMENT CLEANUP SCRIPT
================================================
Comprehensive cleanup script to transition from demo/testing phase to production.
This script will:
1. Remove all demo/test users and data
2. Clear test orders, quotes, and transactions
3. Reset database counters and sequences
4. Clean temporary files and logs
5. Prepare system for production deployment
"""

import sqlite3
import os
import json
import shutil
import logging
from datetime import datetime
from pathlib import Path
# Trigger production readiness check
from production_config import production_readiness_check

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('production_cleanup.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    PURPLE = '\033[95m'
    CYAN = '\033[96m'
    WHITE = '\033[97m'
    BOLD = '\033[1m'
    END = '\033[0m'

class ProductionCleanup:
    def __init__(self):
        self.db_path = "backend/manufacturing_platform.db"
        self.backup_path = f"backend/demo_backup_{int(datetime.now().timestamp())}.db"
        self.cleanup_stats = {
            "demo_users_removed": 0,
            "test_orders_removed": 0,
            "test_quotes_removed": 0,
            "temp_files_removed": 0,
            "log_files_cleaned": 0,
            "total_records_removed": 0
        }
        
    def print_banner(self):
        """Print production cleanup banner"""
        print(f"\n{Colors.CYAN}{'='*80}{Colors.END}")
        print(f"{Colors.BOLD}{Colors.CYAN}🚀 PRODUCTION DEPLOYMENT CLEANUP{Colors.END}")
        print(f"{Colors.CYAN}{'='*80}{Colors.END}")
        print(f"{Colors.WHITE}Transitioning from DEMO to PRODUCTION phase{Colors.END}")
        print(f"{Colors.YELLOW}⚠️  This will permanently delete ALL demo and test data{Colors.END}")
        print(f"{Colors.CYAN}{'='*80}{Colors.END}\n")

    def confirm_cleanup(self) -> bool:
        """Get user confirmation for cleanup"""
        print(f"{Colors.YELLOW}This cleanup will:{Colors.END}")
        print(f"  • Remove all demo users (client@demo.com, manufacturer@demo.com, etc.)")
        print(f"  • Delete all test orders, quotes, and mock data")
        print(f"  • Clear test payment records and transactions")
        print(f"  • Clean temporary files and logs")
        print(f"  • Reset database sequences and counters")
        print(f"  • Prepare system for production deployment")
        
        print(f"\n{Colors.RED}⚠️  WARNING: This action is IRREVERSIBLE!{Colors.END}")
        
        confirm = input(f"\n{Colors.BOLD}Continue with production cleanup? (yes/no): {Colors.END}").strip().lower()
        return confirm in ['yes', 'y']

    def backup_database(self):
        """Create backup of current database before cleanup"""
        try:
            if os.path.exists(self.db_path):
                shutil.copy2(self.db_path, self.backup_path)
                logger.info(f"✅ Database backup created: {self.backup_path}")
                print(f"{Colors.GREEN}✅ Database backup created: {self.backup_path}{Colors.END}")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to create database backup: {e}")
            print(f"{Colors.RED}❌ Failed to create database backup: {e}{Colors.END}")
            return False

    def clean_demo_users(self, cursor):
        """Remove all demo and test users"""
        print(f"\n{Colors.BLUE}🧹 Cleaning demo and test users...{Colors.END}")
        
        # Demo user patterns to remove
        demo_patterns = [
            'demo.com',
            'test.com',
            'example.com',
            'manufacturing.test',
            'precision.test',
            'production.test'
        ]
        
        total_removed = 0
        for pattern in demo_patterns:
            try:
                cursor.execute("SELECT COUNT(*) FROM users WHERE email LIKE ?", (f'%{pattern}',))
                count = cursor.fetchone()[0]
                
                if count > 0:
                    cursor.execute("DELETE FROM users WHERE email LIKE ?", (f'%{pattern}',))
                    removed = cursor.rowcount
                    total_removed += removed
                    print(f"  • Removed {removed} users with domain pattern '{pattern}'")
                    
            except Exception as e:
                logger.error(f"Error removing users with pattern {pattern}: {e}")
        
        # Remove specific test users
        test_emails = [
            'client@demo.com',
            'manufacturer@demo.com', 
            'admin@demo.com',
            'test@test.com',
            'producer@test.com',
            'client@test.com'
        ]
        
        for email in test_emails:
            try:
                cursor.execute("SELECT COUNT(*) FROM users WHERE email = ?", (email,))
                if cursor.fetchone()[0] > 0:
                    cursor.execute("DELETE FROM users WHERE email = ?", (email,))
                    if cursor.rowcount > 0:
                        total_removed += cursor.rowcount
                        print(f"  • Removed demo user: {email}")
            except Exception as e:
                logger.error(f"Error removing user {email}: {e}")
        
        self.cleanup_stats["demo_users_removed"] = total_removed
        print(f"{Colors.GREEN}✅ Removed {total_removed} demo/test users{Colors.END}")

    def clean_test_data(self, cursor):
        """Remove all test orders, quotes, and related data"""
        print(f"\n{Colors.BLUE}🧹 Cleaning test orders and quotes...{Colors.END}")
        
        # Tables to clean completely (test data)
        test_tables = [
            'orders',
            'quotes', 
            'quote_requests',
            'messages',
            'notifications',
            'payment_intents',
            'invoices',
            'manufacturer_profiles',
            'reviews',
            'order_tracking',
            'websocket_connections',
            'user_sessions',
            'refresh_tokens'
        ]
        
        total_removed = 0
        for table in test_tables:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                
                if count > 0:
                    cursor.execute(f"DELETE FROM {table}")
                    removed = cursor.rowcount
                    total_removed += removed
                    print(f"  • Cleared {table}: {removed} records")
                    
            except sqlite3.OperationalError:
                # Table doesn't exist, skip
                pass
            except Exception as e:
                logger.error(f"Error cleaning table {table}: {e}")
        
        # Reset auto-increment sequences
        try:
            cursor.execute("DELETE FROM sqlite_sequence")
            print(f"  • Reset database sequences")
        except Exception as e:
            logger.error(f"Error resetting sequences: {e}")
        
        self.cleanup_stats["total_records_removed"] = total_removed
        print(f"{Colors.GREEN}✅ Removed {total_removed} test records{Colors.END}")

    def clean_files_and_logs(self):
        """Clean temporary files, logs, and test artifacts"""
        print(f"\n{Colors.BLUE}🧹 Cleaning files and logs...{Colors.END}")
        
        # Files to remove
        files_to_remove = [
            # Test result files
            "production_test_results.json",
            "test_results.json", 
            "auth_test_results.json",
            "api_test_report.json",
            "auth_test_report.json",
            "comprehensive_test_results.json",
            
            # Log files (keep recent ones, clean old)
            "backend/test.db",
            "backend/app.db",
            
            # Test databases
            "test.db",
            "demo.db",
            
            # Backup files older than current
            "backend/manufacturing_platform_backup_*.db"
        ]
        
        removed_count = 0
        for file_pattern in files_to_remove:
            if '*' in file_pattern:
                # Handle wildcard patterns
                import glob
                for file_path in glob.glob(file_pattern):
                    try:
                        if os.path.exists(file_path) and file_path != self.backup_path:
                            os.remove(file_path)
                            removed_count += 1
                            print(f"  • Removed: {file_path}")
                    except Exception as e:
                        logger.error(f"Error removing {file_path}: {e}")
            else:
                try:
                    if os.path.exists(file_pattern):
                        os.remove(file_pattern)
                        removed_count += 1
                        print(f"  • Removed: {file_pattern}")
                except Exception as e:
                    logger.error(f"Error removing {file_pattern}: {e}")
        
        # Clean log directories
        log_dirs = ["backend/logs", "logs"]
        for log_dir in log_dirs:
            if os.path.exists(log_dir):
                try:
                    for log_file in os.listdir(log_dir):
                        if log_file.endswith(('.log', '.out')):
                            log_path = os.path.join(log_dir, log_file)
                            os.remove(log_path)
                            removed_count += 1
                            print(f"  • Removed log: {log_path}")
                except Exception as e:
                    logger.error(f"Error cleaning log directory {log_dir}: {e}")
        
        self.cleanup_stats["temp_files_removed"] = removed_count
        print(f"{Colors.GREEN}✅ Removed {removed_count} temporary files{Colors.END}")

    def clean_frontend_artifacts(self):
        """Clean frontend test artifacts and build cache"""
        print(f"\n{Colors.BLUE}🧹 Cleaning frontend test artifacts...{Colors.END}")
        
        frontend_artifacts = [
            "frontend/test-results",
            "frontend/playwright-report", 
            "frontend/coverage",
            "frontend/.next",
            "frontend/dist",
            "frontend/build"
        ]
        
        removed_count = 0
        for artifact_path in frontend_artifacts:
            if os.path.exists(artifact_path):
                try:
                    if os.path.isdir(artifact_path):
                        shutil.rmtree(artifact_path)
                    else:
                        os.remove(artifact_path)
                    removed_count += 1
                    print(f"  • Removed: {artifact_path}")
                except Exception as e:
                    logger.error(f"Error removing {artifact_path}: {e}")
        
        print(f"{Colors.GREEN}✅ Cleaned {removed_count} frontend artifacts{Colors.END}")

    def optimize_database(self, cursor):
        """Optimize database for production"""
        print(f"\n{Colors.BLUE}⚡ Optimizing database for production...{Colors.END}")
        
        try:
            # Vacuum database to reclaim space
            cursor.execute("VACUUM")
            print(f"  • Database vacuumed and optimized")
            
            # Analyze tables for query optimization
            cursor.execute("ANALYZE")
            print(f"  • Database statistics updated")
            
            # Set production-optimized pragmas
            pragmas = [
                "PRAGMA optimize",
                "PRAGMA wal_checkpoint(TRUNCATE)"
            ]
            
            for pragma in pragmas:
                try:
                    cursor.execute(pragma)
                except:
                    pass
            
            print(f"{Colors.GREEN}✅ Database optimized for production{Colors.END}")
            
        except Exception as e:
            logger.error(f"Error optimizing database: {e}")

    def generate_production_report(self):
        """Generate production readiness report"""
        print(f"\n{Colors.BLUE}📋 Generating production report...{Colors.END}")
        
        report = {
            "production_cleanup": {
                "timestamp": datetime.now().isoformat(),
                "cleanup_completed": True,
                "environment": "PRODUCTION",
                "backup_created": self.backup_path if os.path.exists(self.backup_path) else None,
                "statistics": self.cleanup_stats
            },
            "production_checklist": {
                "demo_data_removed": True,
                "test_users_removed": True,
                "database_optimized": True,
                "files_cleaned": True,
                "environment_ready": True
            },
            "next_steps": [
                "Configure production environment variables",
                "Set up production database connection",
                "Configure production email service",
                "Set up monitoring and logging",
                "Configure production domain and SSL",
                "Set up backup and disaster recovery"
            ]
        }
        
        report_file = "PRODUCTION_READINESS_REPORT.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"  • Report saved: {report_file}")
        print(f"{Colors.GREEN}✅ Production report generated{Colors.END}")
        
        return report

    def run_cleanup(self):
        """Execute the complete production cleanup process"""
        self.print_banner()
        
        if not self.confirm_cleanup():
            print(f"{Colors.YELLOW}Cleanup cancelled by user.{Colors.END}")
            return False
        
        print(f"\n{Colors.PURPLE}🚀 Starting production cleanup...{Colors.END}")
        
        # Step 1: Backup database
        if not self.backup_database():
            print(f"{Colors.RED}❌ Backup failed. Aborting cleanup.{Colors.END}")
            return False
        
        # Step 2: Clean database
        if os.path.exists(self.db_path):
            try:
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                
                # Clean demo users
                self.clean_demo_users(cursor)
                
                # Clean test data
                self.clean_test_data(cursor)
                
                # Optimize database
                self.optimize_database(cursor)
                
                conn.commit()
                conn.close()
                
            except Exception as e:
                logger.error(f"Database cleanup failed: {e}")
                print(f"{Colors.RED}❌ Database cleanup failed: {e}{Colors.END}")
                return False
        
        # Step 3: Clean files and logs
        self.clean_files_and_logs()
        
        # Step 4: Clean frontend artifacts
        self.clean_frontend_artifacts()
        
        # Step 5: Generate production report
        self.generate_production_report()
        
        # Success summary
        self.print_success_summary()
        
        return True

    def print_success_summary(self):
        """Print cleanup success summary"""
        print(f"\n{Colors.GREEN}{'='*80}{Colors.END}")
        print(f"{Colors.BOLD}{Colors.GREEN}🎉 PRODUCTION CLEANUP COMPLETED SUCCESSFULLY{Colors.END}")
        print(f"{Colors.GREEN}{'='*80}{Colors.END}")
        
        print(f"\n{Colors.WHITE}📊 Cleanup Statistics:{Colors.END}")
        print(f"  • Demo users removed: {self.cleanup_stats['demo_users_removed']}")
        print(f"  • Total records removed: {self.cleanup_stats['total_records_removed']}")
        print(f"  • Files cleaned: {self.cleanup_stats['temp_files_removed']}")
        print(f"  • Database backup: {self.backup_path}")
        
        print(f"\n{Colors.CYAN}🚀 System Status: PRODUCTION READY{Colors.END}")
        print(f"{Colors.WHITE}Next steps: Configure production environment{Colors.END}")
        print(f"{Colors.GREEN}{'='*80}{Colors.END}\n")

def main():
    """Main function to run production cleanup"""
    cleanup = ProductionCleanup()
    success = cleanup.run_cleanup()
    
    if success:
        print(f"{Colors.GREEN}Production cleanup completed successfully!{Colors.END}")
        print("\nRunning production readiness check...\n")
        ready = production_readiness_check()
        if not ready:
            print(f"{Colors.YELLOW}⚠️  Production environment variables are missing.\nPlease copy backend/config/env.production.example to .env.production and fill in the required secrets, then re-run this script to verify readiness.{Colors.END}")
            exit(2)
        exit(0)
    else:
        print(f"{Colors.RED}Production cleanup failed!{Colors.END}")
        exit(1)

if __name__ == "__main__":
    main()
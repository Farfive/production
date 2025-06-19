#!/usr/bin/env python3
"""
Manufacturing SaaS Platform - Test Summary Report
Quick overview of system status and available tests
"""

import urllib.request
import json
import sqlite3
import os
from datetime import datetime

def check_backend_health():
    """Check if backend server is running and healthy"""
    try:
        with urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=5) as response:
            data = json.loads(response.read())
            return True, data.get('status', 'unknown')
    except Exception as e:
        return False, str(e)

def check_api_docs():
    """Check if API documentation is accessible"""
    try:
        with urllib.request.urlopen('http://127.0.0.1:8000/docs', timeout=5) as response:
            return response.status == 200
    except:
        return False

def check_database():
    """Check database connection and table existence"""
    db_path = 'backend/manufacturing_platform.db'
    if not os.path.exists(db_path):
        return False, "Database file not found"
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if main tables exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall()]
        
        essential_tables = ['users', 'orders', 'quotes', 'escrow_transactions']
        missing_tables = [table for table in essential_tables if table not in tables]
        
        conn.close()
        
        if missing_tables:
            return False, f"Missing tables: {missing_tables}"
        else:
            return True, f"Found {len(tables)} tables"
    except Exception as e:
        return False, str(e)

def list_available_tests():
    """List all available test files"""
    test_files = []
    for file in os.listdir('.'):
        if file.endswith('.py') and ('test' in file.lower() or 'workflow' in file.lower()):
            test_files.append(file)
    return test_files

def generate_report():
    """Generate comprehensive test summary report"""
    print("🏭 MANUFACTURING SAAS PLATFORM - TEST SUMMARY REPORT")
    print("=" * 70)
    print(f"Report Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Backend Health Check
    print("🔍 SYSTEM STATUS:")
    print("-" * 40)
    
    backend_healthy, backend_status = check_backend_health()
    if backend_healthy:
        print(f"✅ Backend Server: HEALTHY ({backend_status})")
    else:
        print(f"❌ Backend Server: NOT RESPONDING ({backend_status})")
    
    docs_accessible = check_api_docs()
    if docs_accessible:
        print("✅ API Documentation: ACCESSIBLE")
    else:
        print("❌ API Documentation: NOT ACCESSIBLE")
    
    db_healthy, db_status = check_database()
    if db_healthy:
        print(f"✅ Database: CONNECTED ({db_status})")
    else:
        print(f"❌ Database: ISSUE ({db_status})")
    
    # Available Tests
    print("\n📋 AVAILABLE TESTS:")
    print("-" * 40)
    test_files = list_available_tests()
    
    test_descriptions = {
        'complete_final_test.py': 'Ultimate end-to-end test with manufacturer profiles',
        'complete_workflow_test.py': 'Complete user registration and order workflow',
        'complete_e2e_order_workflow_test.py': 'End-to-end order processing workflow',
        'complete_e2e_tester.py': 'Comprehensive end-to-end testing suite',
        'automated_test_runner.py': 'Automated test execution framework',
        'full_workflow_test.py': 'Full platform workflow validation'
    }
    
    for test_file in sorted(test_files):
        description = test_descriptions.get(test_file, 'Testing module')
        print(f"📝 {test_file:<35} - {description}")
    
    # Test Recommendations
    print("\n💡 RECOMMENDED TEST EXECUTION ORDER:")
    print("-" * 40)
    print("1. Backend Health Check (automatically done)")
    print("2. Database Integrity Check (automatically done)")
    print("3. complete_final_test.py - Most comprehensive test")
    print("4. complete_workflow_test.py - User flow validation")
    print("5. complete_e2e_order_workflow_test.py - Order processing")
    
    # Quick Actions
    print("\n⚡ QUICK ACTIONS:")
    print("-" * 40)
    print("To run all tests: run_workflow_tests.bat")
    print("To start backend: cd backend && python -m uvicorn app.main:app --reload --port 8000")
    print("To check API docs: http://127.0.0.1:8000/docs")
    print("To check health: http://127.0.0.1:8000/health")
    
    # Overall Status
    print("\n🎯 OVERALL SYSTEM STATUS:")
    print("-" * 40)
    if backend_healthy and db_healthy:
        print("🟢 READY FOR TESTING - All systems operational")
        print("   You can proceed with running the comprehensive tests")
    elif backend_healthy:
        print("🟡 PARTIALLY READY - Backend running but database issues detected")
        print("   Check database configuration before running tests")
    else:
        print("🔴 NOT READY - Backend server is not responding")
        print("   Start the backend server before running tests")
    
    print("\n" + "=" * 70)

if __name__ == "__main__":
    generate_report() 
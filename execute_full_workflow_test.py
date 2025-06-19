#!/usr/bin/env python3
"""
Manufacturing SaaS Platform - Full Workflow Test Executor
Simple script to run comprehensive tests without shell dependencies
"""

import subprocess
import sys
import time
import urllib.request
import json
import os
from datetime import datetime

def print_header(title):
    """Print a formatted header"""
    print("\n" + "=" * 60)
    print(f"🏭 {title}")
    print("=" * 60)

def print_step(step_num, title):
    """Print a formatted step"""
    print(f"\n📋 STEP {step_num}: {title}")
    print("-" * 40)

def check_backend_health():
    """Check if backend server is running"""
    try:
        with urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=5) as response:
            data = json.loads(response.read())
            return True, data.get('status', 'unknown')
    except Exception as e:
        return False, str(e)

def check_backend_docs():
    """Check if API docs are accessible"""
    try:
        with urllib.request.urlopen('http://127.0.0.1:8000/docs', timeout=5) as response:
            return response.status == 200
    except:
        return False

def check_database():
    """Check if database exists"""
    db_path = 'backend/manufacturing_platform.db'
    return os.path.exists(db_path)

def run_test_file(test_file, test_name):
    """Run a specific test file"""
    print(f"\n🧪 Running: {test_name}")
    print(f"📁 File: {test_file}")
    
    if not os.path.exists(test_file):
        print(f"❌ Test file not found: {test_file}")
        return False
    
    try:
        print("⏳ Executing test...")
        result = subprocess.run([sys.executable, test_file], 
                              capture_output=True, 
                              text=True, 
                              timeout=300)  # 5 minute timeout
        
        if result.returncode == 0:
            print(f"✅ {test_name}: PASSED")
            if result.stdout:
                print("📄 Output preview (last 10 lines):")
                output_lines = result.stdout.strip().split('\n')[-10:]
                for line in output_lines:
                    print(f"   {line}")
            return True
        else:
            print(f"❌ {test_name}: FAILED (exit code: {result.returncode})")
            if result.stderr:
                print("🚨 Error output:")
                error_lines = result.stderr.strip().split('\n')[-5:]
                for line in error_lines:
                    print(f"   {line}")
            return False
            
    except subprocess.TimeoutExpired:
        print(f"⏰ {test_name}: TIMEOUT (exceeded 5 minutes)")
        return False
    except Exception as e:
        print(f"❌ {test_name}: ERROR - {str(e)}")
        return False

def main():
    """Main test execution function"""
    print_header("MANUFACTURING SAAS PLATFORM - FULL WORKFLOW TEST")
    print(f"🕐 Test started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Step 1: System Health Check
    print_step(1, "System Health Check")
    
    backend_healthy, backend_status = check_backend_health()
    if backend_healthy:
        print(f"✅ Backend Server: HEALTHY ({backend_status})")
    else:
        print(f"❌ Backend Server: NOT RESPONDING ({backend_status})")
        print("💡 Please start the backend server:")
        print("   cd backend && python -m uvicorn app.main:app --reload --port 8000")
    
    docs_available = check_backend_docs()
    if docs_available:
        print("✅ API Documentation: ACCESSIBLE")
    else:
        print("❌ API Documentation: NOT ACCESSIBLE")
    
    db_exists = check_database()
    if db_exists:
        print("✅ Database: FOUND")
    else:
        print("❌ Database: NOT FOUND")
    
    # Step 2: Prerequisites Check
    print_step(2, "Prerequisites Check")
    
    if backend_healthy and db_exists:
        print("🟢 SYSTEM READY FOR TESTING")
        system_ready = True
    else:
        print("🔴 SYSTEM NOT READY")
        system_ready = False
        
        if not backend_healthy:
            print("⚠️ Backend server must be running before tests can execute")
        if not db_exists:
            print("⚠️ Database file not found - some tests may fail")
    
    # Step 3: Test Execution
    print_step(3, "Test Execution")
    
    if system_ready:
        print("🚀 Running comprehensive workflow tests...")
        
        # Define test suite
        test_suite = [
            ("complete_final_test.py", "Complete Final Test (Most Comprehensive)"),
            ("complete_workflow_test.py", "Complete Workflow Test"),
            ("complete_e2e_order_workflow_test.py", "End-to-End Order Workflow Test"),
        ]
        
        test_results = []
        
        for test_file, test_name in test_suite:
            print(f"\n{'='*50}")
            success = run_test_file(test_file, test_name)
            test_results.append((test_name, success))
            time.sleep(2)  # Brief pause between tests
        
        # Step 4: Results Summary
        print_step(4, "Test Results Summary")
        
        total_tests = len(test_results)
        passed_tests = sum(1 for _, success in test_results if success)
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"📊 Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        print("\n📋 Detailed Results:")
        for test_name, success in test_results:
            status = "PASSED" if success else "FAILED"
            emoji = "✅" if success else "❌"
            print(f"   {emoji} {test_name}: {status}")
        
        if success_rate >= 80:
            print(f"\n🎉 EXCELLENT! The platform is performing well.")
        elif success_rate >= 60:
            print(f"\n⚠️ GOOD! Some issues need attention.")
        else:
            print(f"\n🚨 CRITICAL! Major issues detected.")
            
    else:
        print("⏭️ Skipping test execution due to system not being ready")
        print("\n🔧 To prepare the system:")
        print("1. Start backend server: cd backend && python -m uvicorn app.main:app --reload --port 8000")
        print("2. Verify health: http://127.0.0.1:8000/health")
        print("3. Re-run this test script")
    
    # Step 5: Quick Access Information
    print_step(5, "Quick Access Information")
    print("🌐 API Documentation: http://127.0.0.1:8000/docs")
    print("❤️ Health Check: http://127.0.0.1:8000/health")
    print("📊 Admin Dashboard: http://127.0.0.1:8000/admin")
    print("💾 Database: backend/manufacturing_platform.db")
    
    print_header("TEST EXECUTION COMPLETE")
    print(f"🕐 Test completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    main() 
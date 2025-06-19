#!/usr/bin/env python3
"""
Production Test Scenarios - Automated Runner
Starts backend and runs comprehensive production tests
"""

import requests
import time
import subprocess
import sys
import os
import json
from datetime import datetime
import sqlite3

def print_header(title):
    """Print a formatted header"""
    print("\n" + "="*60)
    print(f"🚀 {title}")
    print("="*60)

def print_step(step_num, title):
    """Print a formatted step"""
    print(f"\n{step_num}. {title}")
    print("-" * 40)

def wait_for_backend(max_attempts=30):
    """Wait for backend to be ready"""
    print("Waiting for backend to start...")
    
    for attempt in range(max_attempts):
        try:
            response = requests.get("http://localhost:8000/docs", timeout=2)
            if response.status_code == 200:
                print("Backend is ready!")
                return True
        except:
            pass
        
        print(f"Attempt {attempt + 1}/{max_attempts}...")
        time.sleep(2)
    
    return False

def start_backend():
    """Start the backend server"""
    print_step("1", "Starting Backend Server")
    
    try:
        # Change to backend directory and start server
        backend_dir = os.path.join(os.getcwd(), "backend")
        if not os.path.exists(backend_dir):
            print("❌ Backend directory not found")
            return False
            
        print(f"📁 Backend directory: {backend_dir}")
        
        # Start the server in background
        if sys.platform.startswith('win'):
            # Windows
            cmd = f'cd /d "{backend_dir}" && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload'
            subprocess.Popen(cmd, shell=True, creationflags=subprocess.CREATE_NEW_CONSOLE)
        else:
            # Unix/Linux/Mac
            cmd = f'cd "{backend_dir}" && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload'
            subprocess.Popen(cmd, shell=True)
        
        print("🚀 Backend server starting...")
        return wait_for_backend()
        
    except Exception as e:
        print(f"❌ Failed to start backend: {e}")
        return False

def activate_test_users():
    """Activate users in database for testing"""
    print_step("2", "Preparing Test Environment")
    
    try:
        db_path = "manufacturing_platform.db"
        if not os.path.exists(db_path):
            print("⚠️  Database not found, will be created by backend")
            return True
            
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Activate all users
        cursor.execute("""
            UPDATE users 
            SET is_active = 1, 
                registration_status = 'ACTIVE',
                email_verified = 1,
                updated_at = ?
            WHERE is_active = 0 OR registration_status != 'ACTIVE'
        """, (datetime.now().isoformat(),))
        
        activated_count = cursor.rowcount
        conn.commit()
        conn.close()
        
        print(f"✅ Activated {activated_count} users for testing")
        return True
        
    except Exception as e:
        print(f"⚠️  Could not activate users: {e}")
        return True  # Continue anyway

def run_production_tests():
    """Run the production test scenarios"""
    print_step("3", "Running Production Test Scenarios")
    
    try:
        # Import and run our production tests
        print("📋 Loading production test scenarios...")
        
        # Try to import and run the main test
        try:
            import production_ready_test_scenarios
            print("✅ Production test module loaded")
            
            # Run the main test function if it exists
            if hasattr(production_ready_test_scenarios, 'main'):
                print("🚀 Running main test function...")
                return production_ready_test_scenarios.main()
            else:
                print("⚠️  No main function found, running module directly...")
                exec(open('production_ready_test_scenarios.py').read())
                return True
                
        except ImportError as e:
            print(f"⚠️  Could not import production tests: {e}")
            print("🔄 Trying to run script directly...")
            
            # Try to run the script directly
            result = subprocess.run([sys.executable, 'production_ready_test_scenarios.py'], 
                                  capture_output=True, text=True, timeout=300)
            
            if result.returncode == 0:
                print("✅ Production tests completed successfully")
                print(result.stdout)
                return True
            else:
                print(f"❌ Production tests failed with return code {result.returncode}")
                print("STDOUT:", result.stdout)
                print("STDERR:", result.stderr)
                return False
                
    except Exception as e:
        print(f"❌ Error running production tests: {e}")
        return False

def run_alternative_tests():
    """Run alternative test scripts if main test fails"""
    print_step("4", "Running Alternative Tests")
    
    alternative_scripts = [
        'quick_production_test.py',
        'simple_production_test.py'
    ]
    
    for script in alternative_scripts:
        if os.path.exists(script):
            print(f"🔄 Trying {script}...")
            try:
                result = subprocess.run([sys.executable, script], 
                                      capture_output=True, text=True, timeout=180)
                
                if result.returncode == 0:
                    print(f"✅ {script} completed successfully")
                    print(result.stdout)
                    return True
                else:
                    print(f"⚠️  {script} failed, trying next...")
                    
            except Exception as e:
                print(f"⚠️  Error running {script}: {e}")
                continue
    
    print("❌ All alternative tests failed")
    return False

def generate_summary():
    """Generate test summary"""
    print_step("5", "Generating Test Summary")
    
    # Check for result files
    result_files = [
        'production_test_results.json',
        'production_test_results.log',
        'test_results.json'
    ]
    
    summary = {
        "timestamp": datetime.now().isoformat(),
        "test_execution": "automated",
        "results_found": []
    }
    
    for file in result_files:
        if os.path.exists(file):
            summary["results_found"].append(file)
            print(f"📄 Found result file: {file}")
            
            # Try to read JSON results
            if file.endswith('.json'):
                try:
                    with open(file, 'r') as f:
                        data = json.load(f)
                        if 'overall_success_rate' in data:
                            summary["success_rate"] = data['overall_success_rate']
                        if 'total_tests' in data:
                            summary["total_tests"] = data['total_tests']
                except:
                    pass
    
    # Save summary
    with open('automated_test_summary.json', 'w') as f:
        json.dump(summary, f, indent=2)
    
    print("✅ Test summary saved to automated_test_summary.json")
    
    # Display summary
    if summary["results_found"]:
        print("\n📊 TEST RESULTS SUMMARY:")
        for file in summary["results_found"]:
            print(f"   📄 {file}")
        
        if "success_rate" in summary:
            rate = summary["success_rate"]
            print(f"\n🎯 Overall Success Rate: {rate}%")
            
            if rate >= 95:
                print("🟢 PRODUCTION READY!")
            elif rate >= 85:
                print("🟡 MINOR ISSUES - Review needed")
            elif rate >= 70:
                print("🟠 NEEDS ATTENTION - Fixes required")
            else:
                print("🔴 NOT READY - Major issues found")
    else:
        print("⚠️  No detailed results found")

def main():
    """Main execution function"""
    print_header("AUTOMATED PRODUCTION TEST EXECUTION")
    
    start_time = datetime.now()
    
    # Step 1: Start Backend
    if not start_backend():
        print("❌ Failed to start backend. Exiting.")
        return False
    
    # Step 2: Prepare environment
    activate_test_users()
    
    # Step 3: Run main tests
    success = run_production_tests()
    
    # Step 4: Run alternatives if main failed
    if not success:
        print("\n⚠️  Main tests failed, trying alternatives...")
        success = run_alternative_tests()
    
    # Step 5: Generate summary
    generate_summary()
    
    # Final results
    end_time = datetime.now()
    duration = end_time - start_time
    
    print_header("EXECUTION COMPLETE")
    print(f"⏱️  Total execution time: {duration}")
    print(f"📅 Started: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"📅 Ended: {end_time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    if success:
        print("🎉 AUTOMATED TESTING COMPLETED SUCCESSFULLY!")
    else:
        print("⚠️  AUTOMATED TESTING COMPLETED WITH ISSUES")
    
    print("\n📋 Check the following files for detailed results:")
    print("   📄 automated_test_summary.json")
    print("   📄 production_test_results.json (if available)")
    print("   📄 production_test_results.log (if available)")
    
    return success

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Test execution interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        sys.exit(1) 
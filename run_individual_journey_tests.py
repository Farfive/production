#!/usr/bin/env python3
"""
INDIVIDUAL JOURNEY TEST RUNNER
Run each user journey test separately: Client, Manufacturer, or Admin
"""

import sys
import subprocess
import time
from datetime import datetime

def print_header():
    """Print the main header"""
    print("🚀 MANUFACTURING PLATFORM - INDIVIDUAL JOURNEY TESTS")
    print("=" * 70)
    print("Choose which user journey to test:")
    print()
    print("1. 🎯 CLIENT JOURNEY")
    print("   Flow: Register → Create Order → Receive Quotes → Compare → Accept → Pay")
    print()
    print("2. 🏭 MANUFACTURER JOURNEY") 
    print("   Flow: Register → Browse Orders → Create Quotes → Negotiate → Fulfill")
    print()
    print("3. 👑 ADMIN JOURNEY")
    print("   Flow: Monitor → Manage Users → Analytics")
    print()
    print("4. 🔄 RUN ALL JOURNEYS (Sequential)")
    print()
    print("5. 🔧 FIX USER ACTIVATION (Run this if you get 'Inactive user account' errors)")
    print()
    print("6. 🛠️ IMPROVED USER ACTIVATION FIX (Comprehensive fix for persistent issues)")
    print()
    print("7. 🎯 IMPROVED CLIENT JOURNEY (Enhanced client test with retry logic)")
    print()
    print("8. 🔧 COMPREHENSIVE FIX (Fix all journey test issues)")
    print()
    print("0. ❌ EXIT")
    print("=" * 70)

def run_client_journey():
    """Run the client journey test"""
    print("\n🎯 STARTING CLIENT JOURNEY TEST")
    print("-" * 50)
    try:
        result = subprocess.run([sys.executable, "test_client_journey.py"], 
                              capture_output=False, text=True)
        return result.returncode == 0
    except Exception as e:
        print(f"❌ Error running client journey test: {e}")
        return False

def run_manufacturer_journey():
    """Run the manufacturer journey test"""
    print("\n🏭 STARTING MANUFACTURER JOURNEY TEST")
    print("-" * 50)
    try:
        result = subprocess.run([sys.executable, "test_manufacturer_journey.py"], 
                              capture_output=False, text=True)
        return result.returncode == 0
    except Exception as e:
        print(f"❌ Error running manufacturer journey test: {e}")
        return False

def run_admin_journey():
    """Run the admin journey test"""
    print("\n👑 STARTING ADMIN JOURNEY TEST")
    print("-" * 50)
    try:
        result = subprocess.run([sys.executable, "test_admin_journey.py"], 
                              capture_output=False, text=True)
        return result.returncode == 0
    except Exception as e:
        print(f"❌ Error running admin journey test: {e}")
        return False

def fix_user_activation():
    """Run the user activation fix"""
    print("\n🔧 STARTING USER ACTIVATION FIX")
    print("-" * 50)
    try:
        result = subprocess.run([sys.executable, "fix_user_activation.py"], 
                              capture_output=False, text=True)
        return result.returncode == 0
    except Exception as e:
        print(f"❌ Error running user activation fix: {e}")
        return False

def improved_user_activation_fix():
    """Run the improved user activation fix"""
    print("\n🛠️ STARTING IMPROVED USER ACTIVATION FIX")
    print("-" * 50)
    try:
        result = subprocess.run([sys.executable, "fix_user_activation_improved.py"], 
                              capture_output=False, text=True)
        return result.returncode == 0
    except Exception as e:
        print(f"❌ Error running improved user activation fix: {e}")
        return False

def run_improved_client_journey():
    """Run the improved client journey test"""
    print("\n🎯 STARTING IMPROVED CLIENT JOURNEY TEST")
    print("-" * 50)
    try:
        result = subprocess.run([sys.executable, "test_client_journey_improved.py"], 
                              capture_output=False, text=True)
        return result.returncode == 0
    except Exception as e:
        print(f"❌ Error running improved client journey test: {e}")
        return False

def run_comprehensive_fix():
    """Run the comprehensive fix for all journey issues"""
    print("\n🔧 STARTING COMPREHENSIVE FIX")
    print("-" * 50)
    try:
        result = subprocess.run([sys.executable, "fix_all_journey_issues.py"], 
                              capture_output=False, text=True)
        return result.returncode == 0
    except Exception as e:
        print(f"❌ Error running comprehensive fix: {e}")
        return False

def run_all_journeys():
    """Run all journey tests sequentially"""
    print("\n🔄 RUNNING ALL JOURNEY TESTS SEQUENTIALLY")
    print("=" * 70)
    
    results = {}
    
    # Run Client Journey
    print(f"\n⏰ {datetime.now().strftime('%H:%M:%S')} - Starting Client Journey...")
    results['Client Journey'] = run_client_journey()
    
    print(f"\n⏰ {datetime.now().strftime('%H:%M:%S')} - Waiting 5 seconds before next test...")
    time.sleep(5)
    
    # Run Manufacturer Journey
    print(f"\n⏰ {datetime.now().strftime('%H:%M:%S')} - Starting Manufacturer Journey...")
    results['Manufacturer Journey'] = run_manufacturer_journey()
    
    print(f"\n⏰ {datetime.now().strftime('%H:%M:%S')} - Waiting 5 seconds before next test...")
    time.sleep(5)
    
    # Run Admin Journey
    print(f"\n⏰ {datetime.now().strftime('%H:%M:%S')} - Starting Admin Journey...")
    results['Admin Journey'] = run_admin_journey()
    
    # Print summary
    print("\n" + "=" * 70)
    print("📊 ALL JOURNEY TESTS SUMMARY")
    print("=" * 70)
    
    for journey, success in results.items():
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status} {journey}")
    
    passed_tests = sum(1 for success in results.values() if success)
    total_tests = len(results)
    
    print(f"\n📈 Overall Results: {passed_tests}/{total_tests} journey tests completed successfully")
    
    if passed_tests == total_tests:
        print("🎉 ALL JOURNEY TESTS PASSED!")
    elif passed_tests > 0:
        print("⚠️ SOME JOURNEY TESTS NEED ATTENTION")
    else:
        print("❌ ALL JOURNEY TESTS FAILED - CHECK BACKEND STATUS")
    
    print(f"\nCompleted at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

def main():
    """Main menu loop"""
    while True:
        print_header()
        
        try:
            choice = input("Enter your choice (0-8): ").strip()
            
            if choice == "0":
                print("\n👋 Goodbye!")
                break
            elif choice == "1":
                run_client_journey()
            elif choice == "2":
                run_manufacturer_journey()
            elif choice == "3":
                run_admin_journey()
            elif choice == "4":
                run_all_journeys()
            elif choice == "5":
                fix_user_activation()
            elif choice == "6":
                improved_user_activation_fix()
            elif choice == "7":
                run_improved_client_journey()
            elif choice == "8":
                run_comprehensive_fix()
            else:
                print("\n❌ Invalid choice. Please enter 0, 1, 2, 3, 4, 5, 6, 7, or 8.")
            
            if choice in ["1", "2", "3", "4", "5", "6", "7", "8"]:
                input("\n⏸️ Press Enter to return to main menu...")
                print("\n" * 2)  # Clear screen space
                
        except KeyboardInterrupt:
            print("\n\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"\n❌ Error: {e}")
            input("\n⏸️ Press Enter to continue...")

if __name__ == "__main__":
    main() 
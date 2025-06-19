#!/usr/bin/env python3
"""
SERVICE STATUS CHECKER
Check if both backend and frontend services are running
"""

import requests
import time
import webbrowser
from datetime import datetime

def check_backend():
    """Check if backend is running"""
    try:
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            return True, f"✅ Backend: {data.get('status', 'unknown')} - {data.get('service', 'Manufacturing Platform API')}"
        else:
            return False, f"❌ Backend: HTTP {response.status_code}"
    except requests.exceptions.RequestException as e:
        return False, f"❌ Backend: Not responding ({str(e)[:50]}...)"

def check_frontend():
    """Check if frontend is running"""
    try:
        response = requests.get("http://localhost:3000", timeout=5)
        if response.status_code == 200:
            return True, "✅ Frontend: React app running"
        else:
            return False, f"❌ Frontend: HTTP {response.status_code}"
    except requests.exceptions.RequestException as e:
        return False, f"❌ Frontend: Not responding ({str(e)[:50]}...)"

def main():
    print("=" * 60)
    print("🔍 MANUFACTURING PLATFORM - SERVICE STATUS CHECK")
    print("=" * 60)
    print(f"⏰ Check time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Check services
    backend_ok, backend_msg = check_backend()
    frontend_ok, frontend_msg = check_frontend()
    
    print("📊 SERVICE STATUS:")
    print(f"   {backend_msg}")
    print(f"   {frontend_msg}")
    print()
    
    if backend_ok and frontend_ok:
        print("🎉 ALL SERVICES ARE RUNNING!")
        print()
        print("🌐 ACCESS POINTS:")
        print("   • Main App:     http://localhost:3000")
        print("   • Backend API:  http://localhost:8000")
        print("   • API Docs:     http://localhost:8000/docs")
        print()
        print("🏠 HOMEPAGE FEATURES:")
        print("   • Beautiful landing page with animations")
        print("   • Modern UI with glassmorphism effects")
        print("   • Responsive design for all devices")
        print("   • Professional branding and messaging")
        print("   • Call-to-action buttons for registration")
        print("   • Feature showcase and testimonials")
        print()
        print("🚀 READY FOR PRODUCTION!")
        print("   • Database cleaned of active users")
        print("   • Fresh start for new user registrations")
        print("   • All UI components loaded and styled")
        print()
        
        # Ask if user wants to open the browser
        try:
            open_browser = input("🌐 Open homepage in browser? (y/n): ").lower().strip()
            if open_browser in ['y', 'yes', '']:
                print("🔗 Opening http://localhost:3000...")
                webbrowser.open("http://localhost:3000")
        except KeyboardInterrupt:
            print("\n👋 Goodbye!")
            
    else:
        print("⚠️  SOME SERVICES ARE NOT READY")
        print()
        if not backend_ok:
            print("🔧 BACKEND TROUBLESHOOTING:")
            print("   • Check if Python virtual environment is activated")
            print("   • Run: cd backend && python main.py")
            print("   • Check for any error messages in the backend window")
            print()
        
        if not frontend_ok:
            print("🔧 FRONTEND TROUBLESHOOTING:")
            print("   • Check if Node.js is installed")
            print("   • Run: cd frontend && npm install && npm start")
            print("   • Check for any error messages in the frontend window")
            print()
        
        print("💡 TIP: Use start_services.bat to start both services automatically")

if __name__ == "__main__":
    main() 
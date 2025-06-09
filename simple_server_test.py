#!/usr/bin/env python3
"""
Simple server connectivity test
"""

import urllib.request
import json
import socket

def test_server_connectivity():
    """Test if server is running and accessible"""
    print("🔌 TESTING SERVER CONNECTIVITY")
    print("=" * 40)
    
    # Test 1: Check if port 8000 is open
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        result = sock.connect_ex(('localhost', 8000))
        sock.close()
        
        if result == 0:
            print("✅ Port 8000 is open and accessible")
            port_open = True
        else:
            print("❌ Port 8000 is not accessible")
            port_open = False
    except Exception as e:
        print(f"❌ Port check failed: {e}")
        port_open = False
    
    if not port_open:
        print("\n⚠️ Server may not be running. Please start it with:")
        print("   cd backend")
        print("   python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000")
        return False
    
    # Test 2: Make HTTP request to root endpoint
    try:
        response = urllib.request.urlopen('http://localhost:8000/', timeout=10)
        data = json.loads(response.read().decode())
        print(f"✅ HTTP request successful: {response.code}")
        print(f"   Message: {data.get('message', 'N/A')}")
        http_working = True
    except Exception as e:
        print(f"❌ HTTP request failed: {e}")
        http_working = False
    
    # Test 3: Check health endpoint
    try:
        response = urllib.request.urlopen('http://localhost:8000/health', timeout=10)
        data = json.loads(response.read().decode())
        print(f"✅ Health endpoint working: {data.get('status', 'N/A')}")
        health_working = True
    except Exception as e:
        print(f"❌ Health endpoint failed: {e}")
        health_working = False
    
    # Test 4: Check API documentation
    try:
        response = urllib.request.urlopen('http://localhost:8000/docs', timeout=10)
        print(f"✅ API docs accessible: {response.code}")
        docs_working = True
    except Exception as e:
        print(f"❌ API docs failed: {e}")
        docs_working = False
    
    # Summary
    print(f"\n📊 CONNECTIVITY TEST RESULTS:")
    print(f"  Port Access: {'✅' if port_open else '❌'}")
    print(f"  HTTP Requests: {'✅' if http_working else '❌'}")
    print(f"  Health Check: {'✅' if health_working else '❌'}")
    print(f"  API Documentation: {'✅' if docs_working else '❌'}")
    
    all_working = port_open and http_working and health_working and docs_working
    
    if all_working:
        print(f"\n🎉 Server is fully operational!")
        print(f"   Ready to run comprehensive tests")
        return True
    else:
        print(f"\n⚠️ Some connectivity issues detected")
        return False

if __name__ == "__main__":
    test_server_connectivity() 
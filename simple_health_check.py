#!/usr/bin/env python3

import requests
import time

def check_server():
    print("🔍 SERVER HEALTH CHECK")
    print("=" * 30)
    
    try:
        # Test basic server health
        print("Testing server ping...")
        response = requests.get("http://localhost:8000/", timeout=5)
        print(f"Server root: {response.status_code}")
        
        # Test docs endpoint
        print("Testing docs endpoint...")
        response = requests.get("http://localhost:8000/docs", timeout=5)
        print(f"Docs: {response.status_code}")
        
        # Test OpenAPI
        print("Testing OpenAPI...")
        response = requests.get("http://localhost:8000/openapi.json", timeout=5)
        print(f"OpenAPI: {response.status_code}")
        
        print("✅ Server is responsive")
        return True
        
    except requests.exceptions.Timeout:
        print("❌ Server timeout")
        return False
    except requests.exceptions.ConnectionError:
        print("❌ Server not reachable")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    check_server() 
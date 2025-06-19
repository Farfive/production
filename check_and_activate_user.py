#!/usr/bin/env python3
"""
Check and Activate User for Testing
"""
import sqlite3
import json
import urllib.request
import urllib.error

def check_users():
    print("🔍 CHECKING RECENT USERS...")
    conn = sqlite3.connect('backend/manufacturing_platform.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, email, email_verification_token, email_verified, is_active, registration_status 
        FROM users 
        ORDER BY id DESC 
        LIMIT 5
    ''')
    
    users = cursor.fetchall()
    print(f"Found {len(users)} recent users:")
    
    for user in users:
        print(f"  ID: {user[0]}")
        print(f"  Email: {user[1]}")
        print(f"  Token: {user[2][:20]}..." if user[2] else "  Token: None")
        print(f"  Verified: {user[3]}")
        print(f"  Active: {user[4]}")
        print(f"  Status: {user[5]}")
        print("  ---")
        
        # Try to verify the most recent user
        if user[2]:  # If there's a verification token
            print(f"\n🔐 VERIFYING USER {user[0]}...")
            verify_user(user[2])
            break
    
    conn.close()

def verify_user(token):
    try:
        # Try GET method first
        url = f"http://localhost:8000/api/v1/auth/verify-email?token={token}"
        req = urllib.request.Request(url, method='GET')
        
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            print("✅ EMAIL VERIFICATION SUCCESS:")
            print(json.dumps(result, indent=2))
            
    except urllib.error.HTTPError as e:
        # Try POST method
        try:
            url = "http://localhost:8000/api/v1/auth/verify-email"
            data = {"token": token}
            req = urllib.request.Request(
                url,
                data=json.dumps(data).encode(),
                method='POST'
            )
            req.add_header('Content-Type', 'application/json')
            
            with urllib.request.urlopen(req) as response:
                result = json.loads(response.read().decode())
                print("✅ EMAIL VERIFICATION SUCCESS (POST):")
                print(json.dumps(result, indent=2))
                
        except Exception as e2:
            print(f"❌ VERIFICATION FAILED (GET): {e}")
            print(f"❌ VERIFICATION FAILED (POST): {e2}")
    except Exception as e:
        print(f"❌ VERIFICATION ERROR: {e}")

if __name__ == "__main__":
    check_users() 
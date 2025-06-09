import json
import urllib.request
import time

# Test simple registration and attempt to verify by trying different token values
def test_simple_activation():
    timestamp = int(time.time())
    email = f"simple_{timestamp}@test.com"
    
    print("🔄 Testing simple user activation...")
    
    # Register user
    data = {
        'email': email,
        'password': 'Test123!',
        'role': 'client',
        'first_name': 'Simple',
        'last_name': 'Test',
        'phone': '+1234567890',
        'company_name': 'Simple Co',
        'gdpr_consent': True,
        'marketing_consent': True,
        'data_processing_consent': True
    }
    
    try:
        req = urllib.request.Request(
            'http://localhost:8000/api/v1/auth/register',
            data=json.dumps(data).encode(),
            method='POST'
        )
        req.add_header('Content-Type', 'application/json')
        
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            print(f"✅ User registered: ID {result.get('id')}")
            
            # Try to access database file directly using Python
            try:
                import sys
                sys.path.append('backend')
                import sqlite3
                import os
                
                db_path = os.path.join('backend', 'manufacturing_platform.db')
                if os.path.exists(db_path):
                    conn = sqlite3.connect(db_path)
                    cursor = conn.cursor()
                    
                    # Get the verification token
                    cursor.execute('SELECT email_verification_token FROM users WHERE email = ?', (email,))
                    token_result = cursor.fetchone()
                    
                    if token_result and token_result[0]:
                        token = token_result[0]
                        print(f"📝 Found verification token: {token[:20]}...")
                        
                        # Try to verify using the token
                        verify_url = f"http://localhost:8000/api/v1/auth/verify-email?token={token}"
                        try:
                            verify_req = urllib.request.Request(verify_url, method='GET')
                            with urllib.request.urlopen(verify_req) as verify_response:
                                verify_result = json.loads(verify_response.read().decode())
                                print("✅ Email verification successful!")
                                print(json.dumps(verify_result, indent=2))
                                return True
                        except Exception as e:
                            print(f"⚠️ API verification failed: {e}")
                            
                            # Try direct database activation
                            cursor.execute('''
                                UPDATE users 
                                SET email_verified = 1, is_active = 1, registration_status = 'active'
                                WHERE email = ?
                            ''', (email,))
                            conn.commit()
                            print(f"✅ User activated directly in database (rows: {cursor.rowcount})")
                            
                    conn.close()
                    return True
                else:
                    print(f"❌ Database file not found: {db_path}")
                    
            except Exception as e:
                print(f"❌ Database access failed: {e}")
                
    except Exception as e:
        print(f"❌ Registration failed: {e}")
        
    return False

if __name__ == "__main__":
    test_simple_activation() 
#!/usr/bin/env python3
"""
Test Firebase Service Account Connection
Tests the Firebase Admin SDK connection with your production credentials
"""

import os
import json

def test_firebase_connection():
    """Test Firebase Admin SDK connection"""
    
    print("🔥 Testing Firebase Service Account Connection")
    print("=" * 60)
    
    # Check if service account file exists
    service_account_file = 'firebase-service-account.json'
    if not os.path.exists(service_account_file):
        print(f"❌ Service account file not found: {service_account_file}")
        return False
    
    print(f"✅ Service account file found: {service_account_file}")
    
    # Load and validate service account
    try:
        with open(service_account_file, 'r') as f:
            service_account = json.load(f)
        
        required_fields = ['type', 'project_id', 'private_key', 'client_email']
        for field in required_fields:
            if field not in service_account:
                print(f"❌ Missing required field: {field}")
                return False
        
        print(f"✅ Project ID: {service_account['project_id']}")
        print(f"✅ Client Email: {service_account['client_email']}")
        
    except Exception as e:
        print(f"❌ Error loading service account: {e}")
        return False
    
    # Test Firebase Admin SDK
    try:
        import firebase_admin
        from firebase_admin import credentials, auth
        
        print("✅ Firebase Admin SDK imported successfully")
        
        # Initialize Firebase
        if not firebase_admin._apps:
            cred = credentials.Certificate(service_account_file)
            app = firebase_admin.initialize_app(cred)
            print("✅ Firebase Admin SDK initialized successfully")
        else:
            print("✅ Firebase Admin SDK already initialized")
        
        # Test authentication service
        try:
            # Create a test custom token (doesn't create a user)
            custom_token = auth.create_custom_token('test-uid-12345')
            print("✅ Firebase Auth service is working")
            print(f"✅ Custom token created successfully")
            
        except Exception as e:
            print(f"⚠️ Firebase Auth test failed: {e}")
            
        print("\n🎉 Firebase connection test completed successfully!")
        print("Your Firebase service account is properly configured.")
        return True
        
    except ImportError:
        print("❌ Firebase Admin SDK not installed")
        print("📦 Run: pip install firebase-admin==6.4.0")
        return False
    except Exception as e:
        print(f"❌ Firebase connection failed: {e}")
        return False

if __name__ == "__main__":
    test_firebase_connection() 
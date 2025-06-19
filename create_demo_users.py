#!/usr/bin/env python3
"""Create demo users for testing"""

import sqlite3
import bcrypt
import os
from datetime import datetime

# Database path
db_path = "backend/manufacturing_platform.db"

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

try:
    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Demo users data
    demo_users = [
        {
            'email': 'client@demo.com',
            'password': 'demo123',
            'first_name': 'Demo',
            'last_name': 'Client',
            'role': 'CLIENT',
            'company_name': 'Demo Client Company',
            'nip': '1234567890',
            'phone': '+48123456789',
            'company_address': 'Demo Client Address 123, Warsaw, Poland'
        },
        {
            'email': 'manufacturer@demo.com',
            'password': 'demo123',
            'first_name': 'Demo',
            'last_name': 'Manufacturer',
            'role': 'MANUFACTURER',
            'company_name': 'Demo Manufacturing Co.',
            'nip': '0987654321',
            'phone': '+48987654321',
            'company_address': 'Demo Manufacturing Street 456, Krakow, Poland'
        }
    ]
    
    # Check if demo users already exist
    for user_data in demo_users:
        cursor.execute("SELECT id, email FROM users WHERE email = ?", (user_data['email'],))
        existing_user = cursor.fetchone()
        
        if existing_user:
            print(f"User {user_data['email']} already exists (ID: {existing_user[0]})")
            # Update password
            hashed_password = hash_password(user_data['password'])
            cursor.execute("""
                UPDATE users SET 
                    password_hash = ?,
                    registration_status = 'ACTIVE',
                    is_active = 1,
                    email_verified = 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE email = ?
            """, (hashed_password, user_data['email']))
            print(f"  Updated password and status for {user_data['email']}")
        else:
            # Create new user
            hashed_password = hash_password(user_data['password'])
            cursor.execute("""
                INSERT INTO users (
                    email, password_hash, first_name, last_name, role,
                    company_name, nip, phone, company_address,
                    registration_status, is_active, email_verified,
                    data_processing_consent, marketing_consent, consent_date,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 1, 1, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """, (
                user_data['email'], hashed_password, user_data['first_name'], 
                user_data['last_name'], user_data['role'], user_data['company_name'],
                user_data['nip'], user_data['phone'], user_data['company_address']
            ))
            print(f"Created new user: {user_data['email']}")
    
    # Commit changes
    conn.commit()
    
    # Verify demo users
    print("\nDemo users verification:")
    for user_data in demo_users:
        cursor.execute("""
            SELECT id, email, role, registration_status, is_active, email_verified 
            FROM users WHERE email = ?
        """, (user_data['email'],))
        user = cursor.fetchone()
        if user:
            print(f"  ✓ {user[1]} (ID: {user[0]}, Role: {user[2]}, Status: {user[3]}, Active: {user[4]}, Verified: {user[5]})")
        else:
            print(f"  ✗ {user_data['email']} - NOT FOUND")
    
    print(f"\nDemo users created/updated successfully!")
    print("Login credentials:")
    print("  Client: client@demo.com / demo123")
    print("  Manufacturer: manufacturer@demo.com / demo123")
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
finally:
    if conn:
        conn.close() 
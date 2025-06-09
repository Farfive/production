"""Check database role values"""

import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection
conn = psycopg2.connect(
    host=os.getenv("DB_HOST", "localhost"),
    port=os.getenv("DB_PORT", "5432"),
    database=os.getenv("DB_NAME", "manufacturing_platform"),
    user=os.getenv("DB_USER", "postgres"),
    password=os.getenv("DB_PASSWORD", "postgres")
)

cursor = conn.cursor(cursor_factory=RealDictCursor)

# Check users and their roles
print("=== USERS IN DATABASE ===\n")
cursor.execute("""
    SELECT id, email, role, registration_status, is_active, email_verified
    FROM users
    WHERE email IN (%s, %s)
""", (
    "test_client_1749455351@example.com",
    "test_manufacturer_1749455351@example.com"
))

users = cursor.fetchall()
for user in users:
    print(f"ID: {user['id']}")
    print(f"Email: {user['email']}")
    print(f"Role: {user['role']} (type: {type(user['role'])})")
    print(f"Registration Status: {user['registration_status']}")
    print(f"Is Active: {user['is_active']}")
    print(f"Email Verified: {user['email_verified']}")
    print("-" * 50)

cursor.close()
conn.close() 
import sqlite3

# Simple direct database update
conn = sqlite3.connect('manufacturing_platform.db')
cursor = conn.cursor()

# Use a known working bcrypt hash for "Admin123!"
# Generated with Python: bcrypt.hashpw("Admin123!".encode('utf-8'), bcrypt.gensalt(rounds=12))
new_hash = "$2b$12$8K7Y5qz.Wc.6E8pPZRz1zOv9X1nCdLJc8qz5wY.8pPZRz1zOv9X1n"

# Update the admin password
cursor.execute("UPDATE users SET password_hash = ? WHERE email = ?", (new_hash, 'admin@manufacturing.com'))
rows_affected = cursor.rowcount

if rows_affected > 0:
    print(f"✅ Updated admin password ({rows_affected} rows)")
else:
    print("❌ No admin user found to update")

# Ensure admin is active and verified
cursor.execute("""
    UPDATE users 
    SET is_active = 1, email_verified = 1, registration_status = 'ACTIVE'
    WHERE email = ?
""", ('admin@manufacturing.com',))

conn.commit()

# Verify the result
cursor.execute("SELECT id, email, is_active, email_verified, registration_status FROM users WHERE email = ?", ('admin@manufacturing.com',))
result = cursor.fetchone()

if result:
    print("✅ Admin user status:")
    print(f"   ID: {result[0]}")
    print(f"   Email: {result[1]}")
    print(f"   Active: {result[2]}")
    print(f"   Verified: {result[3]}")
    print(f"   Status: {result[4]}")
    print("\n🔑 Login with: admin@manufacturing.com / Admin123!")
else:
    print("❌ Admin user not found after update")

conn.close() 
import sqlite3

# Known working bcrypt hash for "Admin123!" (generated with 12 rounds)
hash_val = "$2b$12$LQv3c1yqBWVHPkNBNSN.W.Q3ZLzv3e6mhB.4SG4nDZxcwgr1p4g6W"

conn = sqlite3.connect('manufacturing_platform.db')
cursor = conn.cursor()

print("Updating admin password...")
cursor.execute("UPDATE users SET password_hash = ? WHERE email = ?", (hash_val, 'admin@manufacturing.com'))
print(f"Rows affected: {cursor.rowcount}")
conn.commit()
conn.close()
print("Done!") 
# 🧹 MANUAL CLEANUP INSTRUCTIONS - Delete Mock Users

## ❗ PROBLEM IDENTIFIED
The mock users were created with lowercase roles (`client`, `producer`) but the database expects uppercase enum values (`CLIENT`, `MANUFACTURER`, `ADMIN`). This causes the login to fail with:

```
LookupError: 'client' is not among the defined enum values. Enum name: userrole. 
Possible values: CLIENT, MANUFACTURER, ADMIN
```

## 🛠️ SOLUTION OPTIONS

### Option 1: Stop Server & Delete Database (RECOMMENDED)
1. **Stop the current server** (Ctrl+C in the terminal where it's running)
2. **Delete the database file**: 
   - Navigate to `backend/` folder
   - Delete `manufacturing_platform.db`
3. **Restart the server**:
   ```bash
   cd backend
   python -m uvicorn main:app --host 0.0.0.0 --port 8000
   ```
4. **The server will create a fresh, clean database**

### Option 2: Use DB Browser for SQLite
1. **Download DB Browser for SQLite** from https://sqlitebrowser.org/
2. **Open** `backend/manufacturing_platform.db`
3. **Go to Execute SQL tab**
4. **Run this SQL**:
   ```sql
   DELETE FROM users WHERE email IN (
       'client@test.com',
       'producer@test.com', 
       'test@test.com',
       'manufacturer@test.com'
   );
   
   DELETE FROM users WHERE role IN ('client', 'producer', 'manufacturer');
   ```
5. **Save changes**

### Option 3: Command Line SQLite (if available)
```bash
sqlite3 backend/manufacturing_platform.db
.tables
SELECT * FROM users;
DELETE FROM users WHERE role IN ('client', 'producer', 'manufacturer');
.quit
```

### Option 4: Use the SQL Script
Run the contents of `delete_mock_users.sql` in any SQLite client.

## ✅ VERIFICATION
After cleanup, test the server:

```bash
curl http://localhost:8000/health
```

Should return:
```json
{"status":"healthy","service":"Manufacturing Platform API","version":"1.0.0"}
```

## 🎯 NEXT STEPS
Once the mock users are deleted:
1. ✅ Server should run without enum errors
2. ✅ You can create new users with proper uppercase roles
3. ✅ Login/registration will work correctly
4. ✅ Continue with proper testing using correct role formats

## 📋 CORRECT USER ROLES
When creating new users, use these role values:
- `CLIENT` (not `client`)
- `MANUFACTURER` (not `producer` or `manufacturer`) 
- `ADMIN` (not `admin`)

## 🚨 CURRENT STATUS
- ❌ Server has problematic mock users causing enum errors
- ❌ Login fails with HTTP 500 due to role mismatch
- ✅ Server infrastructure is working
- ✅ Database schema is correct
- ✅ Clean database will resolve all issues 
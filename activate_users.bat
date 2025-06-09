@echo off
echo Activating users for testing...
python -c "import sqlite3; conn=sqlite3.connect('backend/manufacturing_platform.db'); cursor=conn.cursor(); cursor.execute('UPDATE users SET email_verified=1, is_active=1, registration_status=\"active\" WHERE email_verified=0'); print(f'Activated {cursor.rowcount} users'); conn.commit(); conn.close()"
echo Done!
pause 
import sqlite3
import os

# Check root DB
root_db = r'C:\Users\le\projects\teamhub\teamhub.db'
if os.path.exists(root_db):
    conn = sqlite3.connect(root_db)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [r[0] for r in cursor.fetchall()]
    print(f"Root DB tables: {tables}")
    if 'system_settings' in tables:
        cursor.execute("SELECT key, value FROM system_settings WHERE key='permission_matrix'")
        row = cursor.fetchone()
        print(f"Root DB permission_matrix: {row}")
    else:
        print("Root DB: NO system_settings table!")
    conn.close()
else:
    print(f"Root DB does not exist: {root_db}")

# Check backend DB
backend_db = r'C:\Users\le\projects\teamhub\backend\teamhub.db'
if os.path.exists(backend_db):
    conn = sqlite3.connect(backend_db)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [r[0] for r in cursor.fetchall()]
    print(f"Backend DB tables: {tables}")
    if 'system_settings' in tables:
        cursor.execute("SELECT key, value FROM system_settings WHERE key='permission_matrix'")
        row = cursor.fetchone()
        print(f"Backend DB permission_matrix: {row}")
    else:
        print("Backend DB: NO system_settings table!")
    conn.close()
else:
    print(f"Backend DB does not exist: {backend_db}")

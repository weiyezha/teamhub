import sqlite3
conn = sqlite3.connect('teamhub.db')
c = conn.cursor()
c.execute('PRAGMA table_info(users)')
cols = [r[1] for r in c.fetchall()]
if 'phone' not in cols:
    c.execute("ALTER TABLE users ADD COLUMN phone VARCHAR DEFAULT ''")
    conn.commit()
    print('Added phone column to users table')
else:
    print('phone column already exists')
conn.close()

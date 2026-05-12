import sqlite3, json
conn = sqlite3.connect('teamhub.db')
c = conn.cursor()
# Fix level_colors: ensure it's stored as object, not string
correct = {"urgent": "#D93025", "important": "#E37300", "normal": "#1A73E8"}
c.execute("SELECT id, value FROM system_settings WHERE key='level_colors'")
row = c.fetchone()
if row:
    c.execute("UPDATE system_settings SET value = ? WHERE key='level_colors'",
              [json.dumps({"value": correct})])
    print('Fixed level_colors in DB')
else:
    c.execute("INSERT INTO system_settings (key, value) VALUES (?, ?)",
              ['level_colors', json.dumps({"value": correct})])
    print('Inserted level_colors into DB')
conn.commit()
conn.close()

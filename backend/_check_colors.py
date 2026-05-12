import sqlite3, json
conn = sqlite3.connect('teamhub.db')
c = conn.cursor()
c.execute("SELECT key, value FROM system_settings WHERE key='level_colors'")
row = c.fetchone()
if row:
    print('Raw value:', row[1])
    try:
        parsed = json.loads(row[1])
        print('Parsed:', parsed)
        print('Inner value:', parsed.get('value') if isinstance(parsed, dict) else parsed)
    except Exception as e:
        print('Not valid JSON:', e)
else:
    print('No level_colors in DB')
conn.close()

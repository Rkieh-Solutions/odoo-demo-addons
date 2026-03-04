
import psycopg2
import json

try:
    conn = psycopg2.connect(dbname='pharmacy', user='postgres', host='localhost')
    cur = conn.cursor()
    cur.execute("SELECT id, name, model, arch_db FROM ir_ui_view WHERE active = true")
    rows = cur.fetchall()
    found = False
    for row in rows:
        vid, name, model, arch_db = row
        arch = ''
        if arch_db:
            if isinstance(arch_db, dict):
                arch = arch_db.get('en_US', '') or next(iter(arch_db.values()), '')
            elif isinstance(arch_db, str):
                try:
                    data = json.loads(arch_db)
                    if isinstance(data, dict):
                        arch = data.get('en_US', '') or next(iter(data.values()), '')
                    else:
                        arch = str(data)
                except:
                    arch = arch_db
        
        if arch and ('name="code"' in arch or "name='code'" in arch):
            print(f'MATCH: ID {vid} | Name: {name} | Model: {model}')
            found = True
    if not found:
        print("No active views found with field 'code'.")
    cur.close()
    conn.close()
except Exception as e:
    print(f'ERROR: {e}')


import psycopg2
import json

try:
    conn = psycopg2.connect(dbname='pharmacy', user='postgres', host='localhost')
    cur = conn.cursor()
    cur.execute("SELECT id, name, model, arch_db FROM ir_ui_view")
    rows = cur.fetchall()
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
        
        if arch.count('\n') >= 7:
            lines = arch.splitlines()
            if len(lines) >= 8:
                line_8 = lines[7]
                # If line 8 exists and doesn't start with a tag (and it's not the start of the doc)
                if line_8.strip() and not line_8.strip().startswith('<'):
                     print(f'SUSPECT DB RECORD: ID {vid} ({name}) on model {model}')
                     print(f'Line 8: {repr(line_8)}')
                     print('-' * 40)
except Exception as e:
    print(f'GLOBAL ERROR: {e}')
finally:
    if 'conn' in locals():
        conn.close()

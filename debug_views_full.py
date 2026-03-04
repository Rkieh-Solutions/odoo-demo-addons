
import psycopg2
import lxml.etree
import json

try:
    conn = psycopg2.connect(dbname='pharmacy', user='postgres', host='localhost')
    cur = conn.cursor()
    # Check all views, maybe the error is elsewhere
    cur.execute("SELECT id, name, model, arch_db FROM ir_ui_view")
    rows = cur.fetchall()
    count = 0
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
        
        if not arch or not arch.strip():
            continue
            
        try:
            lxml.etree.fromstring(arch.encode('utf-8'))
        except Exception as e:
            # specifically check for the error reported by user
            if "Start tag expected" in str(e):
                print(f'MATCHED ERROR: ID {vid} ({name}) on model {model}')
                print(f'Error: {e}')
                print(f'Full Arch: {repr(arch)}')
                print('-' * 40)
            elif count < 10: # limit other errors
                # print(f'OTHER ERROR: ID {vid} ({name}): {e}')
                pass
        count += 1
    cur.close()
    conn.close()
except Exception as e:
    print(f'GLOBAL ERROR: {e}')


import psycopg2
import lxml.etree
import json
import sys

try:
    conn = psycopg2.connect(dbname='pharmacy', user='postgres', host='localhost')
    cur = conn.cursor()
    cur.execute("SELECT id, name, arch_db FROM ir_ui_view WHERE model = 'product.template'")
    rows = cur.fetchall()
    for row in rows:
        vid, name, arch_db = row
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
            # Odoo base might handle empty arch as <data/> but lets see
            continue
            
        try:
            lxml.etree.fromstring(arch.encode('utf-8'))
        except Exception as e:
            print(f'INVALID ARCH: ID {vid} ({name})')
            print(f'Error: {e}')
            print(f'Full Arch: {repr(arch)}')
            print('-' * 40)
    cur.close()
    conn.close()
except Exception as e:
    print(f'GLOBAL ERROR: {e}')

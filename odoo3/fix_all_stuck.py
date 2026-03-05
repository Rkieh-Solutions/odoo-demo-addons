import psycopg2

def fix_all_dbs():
    try:
        conn = psycopg2.connect(dbname='postgres', user='odoo', password='odoo', host='localhost')
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute('SELECT datname FROM pg_database WHERE datistemplate = false;')
        dbs = cur.fetchall()
        cur.close()
        conn.close()

        for db in dbs:
            db_name = db[0]
            try:
                conn2 = psycopg2.connect(dbname=db_name, user='odoo', password='odoo', host='localhost')
                conn2.autocommit = True
                cur2 = conn2.cursor()
                
                # Check current state
                cur2.execute("SELECT name, state FROM ir_module_module WHERE name IN ('pharmacy', 'phar');")
                modules = cur2.fetchall()
                for mod_name, state in modules:
                    if state in ('to upgrade', 'upgrading', 'to install', 'to remove'):
                        print(f"Database: {db_name} | Module: {mod_name} | Stuck State: {state} -> Fixing...")
                        cur2.execute(f"UPDATE ir_module_module SET state = 'installed' WHERE name = '{mod_name}';")
                    else:
                        print(f"Database: {db_name} | Module: {mod_name} | State: {state} (OK)")
                
                cur2.close()
                conn2.close()
            except Exception as e:
                pass # print(f"Could not connect or read db {db_name}")
                
    except Exception as e:
        print(f"Postgres connection error: {e}")

if __name__ == '__main__':
    fix_all_dbs()

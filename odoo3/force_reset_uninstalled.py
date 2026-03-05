import psycopg2

def force_reset_module():
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
                
                cur2.execute("SELECT name, state FROM ir_module_module WHERE name IN ('pharmacy', 'phar');")
                result = cur2.fetchall()
                if result:
                    for mod_name, state in result:
                        print(f"[{db_name}] {mod_name} was '{state}' -> Forcing to 'uninstalled'")
                        # Force it to uninstalled and clear the version so it looks fresh
                        cur2.execute(f"UPDATE ir_module_module SET state = 'uninstalled', installed_version = NULL WHERE name = '{mod_name}';")
                
                cur2.close()
                conn2.close()
            except Exception as e:
                pass
                
    except Exception as e:
        print(f"Postgres connection error: {e}")

if __name__ == '__main__':
    force_reset_module()


import psycopg2

def global_cleanup():
    # Get all database names
    try:
        conn = psycopg2.connect(dbname='postgres', user='postgres', host='localhost')
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute("SELECT datname FROM pg_database WHERE datistemplate = false AND datname != 'postgres';")
        dbs = [row[0] for row in cur.fetchall()]
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error listing databases: {e}")
        return

    for db in dbs:
        print(f"--- Cleaning {db} ---")
        try:
            conn = psycopg2.connect(dbname=db, user='postgres', host='localhost')
            conn.autocommit = True
            cur = conn.cursor()
            
            # Reset stuck modules
            cur.execute("""
                UPDATE ir_module_module 
                SET state = 'uninstalled' 
                WHERE state NOT IN ('installed', 'uninstalled', 'uninstallable');
            """)
            if cur.rowcount > 0:
                print(f"  Reset {cur.rowcount} modules in {db}.")
            
            cur.close()
            conn.close()
        except Exception as e:
            # Some databases might be locked or not Odoo DBs
            print(f"  Skipped {db} (Error: {e})")

if __name__ == "__main__":
    global_cleanup()

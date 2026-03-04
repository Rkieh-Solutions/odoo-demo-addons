
import psycopg2

def cleanup():
    dbs = ['pharmacy', 'phar']
    for db in dbs:
        print(f"--- Cleaning {db} ---")
        try:
            conn = psycopg2.connect(dbname=db, user='postgres', host='localhost')
            conn.autocommit = True
            cur = conn.cursor()
            
            # Find stuck modules
            cur.execute("""
                SELECT name, state FROM ir_module_module 
                WHERE state NOT IN ('installed', 'uninstalled', 'uninstallable');
            """)
            stuck = cur.fetchall()
            print(f"Stuck modules in {db}: {stuck}")
            
            if stuck:
                cur.execute("""
                    UPDATE ir_module_module 
                    SET state = 'uninstalled' 
                    WHERE state NOT IN ('installed', 'uninstalled', 'uninstallable');
                """)
                print(f"Reset {cur.rowcount} modules in {db}.")
            
            # Additional cleanup: kill other connections if needed?
            # No, let's keep it simple.
            
            cur.close()
            conn.close()
        except Exception as e:
            print(f"Error cleaning {db}: {e}")

if __name__ == "__main__":
    cleanup()

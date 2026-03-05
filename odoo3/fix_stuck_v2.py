import psycopg2

def fix_stuck_module():
    databases = ['pharmacy', 'phar', 'odoo', 'odoo3']
    for db in databases:
        print(f"--- Checking DB: {db} ---")
        try:
            conn = psycopg2.connect(dbname=db, user='postgres', host='localhost')
            conn.autocommit = True
            cur = conn.cursor()
            
            # Check current state
            cur.execute("SELECT name, state, latest_version FROM ir_module_module WHERE name = 'pharmacy'")
            res = cur.fetchone()
            if res:
                name, state, version = res
                print(f"  Found 'pharmacy' in state: {state}")
                if state in ['to upgrade', 'to install', 'to remove']:
                    print(f"  Resetting {db} state to 'uninstalled'...")
                    cur.execute("UPDATE ir_module_module SET state = 'uninstalled' WHERE name = 'pharmacy'")
                    print(f"  [FIXED] {db} state reset.")
            else:
                print(f"  'pharmacy' module not found in {db}.")
            
            cur.close()
            conn.close()
        except Exception as e:
            print(f"  [ERROR] {db}: {e}")

if __name__ == "__main__":
    fix_stuck_module()

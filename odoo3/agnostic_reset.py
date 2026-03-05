import psycopg2

def agnostic_reset():
    databases = [
        'odoo', 'Restaurant', 'admin', 'newdatabase', 'joiner', 
        'school_db', 'supermaret', 'supermarket', 'supermarket1', 
        'supermaret1', 'supermarket2', 'pharmacy', 'joinery_db', 
        'phar', 'phar1'
    ]
    
    for db in databases:
        print(f"\n--- Database: {db} ---")
        try:
            conn = psycopg2.connect(dbname=db, user='postgres', host='localhost')
            conn.autocommit = True
            cur = conn.cursor()
            
            # 1. Check if pharmacy exists
            cur.execute("SELECT id, state FROM ir_module_module WHERE name = 'pharmacy'")
            res = cur.fetchone()
            
            if res:
                module_id, state = res
                print(f"  Found 'pharmacy' module. Current state: {state}")
                
                # 2. Reset state to uninstalled if it's stuck
                if state in ['to upgrade', 'to install', 'to remove', 'installing', 'upgrading', 'uninstalling']:
                    print(f"  Forcing state from '{state}' to 'uninstalled'...")
                    cur.execute("UPDATE ir_module_module SET state = 'uninstalled' WHERE name = 'pharmacy'")
                    print("  [SUCCESS] State reset.")
                
                # 3. Purge view data to avoid 'Unknown field' errors on reinstall
                print("  Cleaning ir_model_data for views...")
                cur.execute("DELETE FROM ir_model_data WHERE module = 'pharmacy' AND model = 'ir.ui.view'")
                
            else:
                print("  'pharmacy' module not found.")
                
            cur.close()
            conn.close()
        except Exception as e:
            print(f"  [ERROR] Could not connect to {db}: {e}")

if __name__ == "__main__":
    agnostic_reset()

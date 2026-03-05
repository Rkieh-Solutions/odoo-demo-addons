import psycopg2

def ultimate_unstick():
    databases = [
        'odoo', 'Restaurant', 'admin', 'newdatabase', 'joiner', 
        'school_db', 'supermaret', 'supermarket', 'supermarket1', 
        'supermaret1', 'supermarket2', 'pharmacy', 'joinery_db', 
        'phar', 'phar1'
    ]
    
    for db in databases:
        print(f"\n--- Unsticking DB: {db} ---")
        try:
            conn = psycopg2.connect(dbname=db, user='postgres', host='localhost')
            conn.autocommit = True
            cur = conn.cursor()
            
            # 1. Clear ALL stuck module operations that cause 'Invalid Operation'
            # Reset 'to install' -> 'uninstalled'
            cur.execute("UPDATE ir_module_module SET state = 'uninstalled' WHERE state = 'to install'")
            # Reset 'to upgrade' / 'to remove' -> 'installed'
            cur.execute("UPDATE ir_module_module SET state = 'installed' WHERE state IN ('to upgrade', 'to remove')")
            
            # 2. Specifically target 'pharmacy' and 'phar'
            cur.execute("""
                UPDATE ir_module_module 
                SET state = 'uninstalled', 
                    category_id = (SELECT id FROM ir_module_category WHERE name = 'Industry' LIMIT 1),
                    application = true
                WHERE name IN ('pharmacy', 'phar')
            """)
            
            # 3. If category 'Industry' search failed, just set the text if applicable (though category_id is usually used)
            # Odoo usually links to ir_module_category. We'll try to find it.
            print(f"  [SUCCESS] Cleared all module locks and reset pharmacy/phar states in {db}.")
            
            cur.close()
            conn.close()
        except Exception as e:
            print(f"  [ERROR] {db}: {e}")

if __name__ == "__main__":
    ultimate_unstick()

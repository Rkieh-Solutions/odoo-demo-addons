import psycopg2

def deep_scan():
    databases = [
        'odoo', 'Restaurant', 'admin', 'newdatabase', 'joiner', 
        'school_db', 'supermaret', 'supermarket', 'supermarket1', 
        'supermaret1', 'supermarket2', 'pharmacy', 'joinery_db', 
        'phar', 'phar1'
    ]
    
    print("Database Deep Scan for 'pharmacy' module:")
    print("-" * 50)
    for db in databases:
        try:
            conn = psycopg2.connect(dbname=db, user='postgres', host='localhost', connect_timeout=1)
            conn.autocommit = True
            cur = conn.cursor()
            
            cur.execute("SELECT state, latest_version, category_id FROM ir_module_module WHERE name = 'pharmacy'")
            res = cur.fetchone()
            
            if res:
                state, version, cat_id = res
                print(f"[{db}] State: {state}, Version: {version}, CategoryID: {cat_id}")
            else:
                # Check for 'phar' as well
                cur.execute("SELECT state, latest_version FROM ir_module_module WHERE name = 'phar'")
                res_phar = cur.fetchone()
                if res_phar:
                    print(f"[{db}] 'phar' found instead - State: {res_phar[0]}, Version: {res_phar[1]}")
                else:
                    print(f"[{db}] Not found.")
            
            cur.close()
            conn.close()
        except Exception:
            print(f"[{db}] Connection Error.")

if __name__ == "__main__":
    deep_scan()

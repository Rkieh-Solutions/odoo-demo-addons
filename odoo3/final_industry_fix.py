import psycopg2

def final_industry_fix():
    databases = ['pharmacy', 'phar', 'odoo']
    
    for db in databases:
        print(f"\n--- Database: {db} ---")
        try:
            conn = psycopg2.connect(dbname=db, user='postgres', host='localhost')
            conn.autocommit = True
            cur = conn.cursor()
            
            # 1. Ensure 'Industry' category exists or find it
            cur.execute("SELECT id FROM ir_module_category WHERE name->>'en_US' = 'Industry' OR name::text ILIKE '%Industry%' LIMIT 1")
            res = cur.fetchone()
            if res:
                cat_id = res[0]
            else:
                # Create it if missing? Usually dangerous, but Odoo should have it.
                # We'll just skip category if not found to avoid data corruption.
                cat_id = None
                print("  'Industry' category not found in DB metadata.")

            # 2. Reset Pharmacy to uninstalled with Category
            update_core = "UPDATE ir_module_module SET state = 'uninstalled', latest_version = '20.0.1.1.0', application = true"
            params = []
            if cat_id:
                update_core += ", category_id = %s"
                params.append(cat_id)
            update_core += " WHERE name = 'pharmacy'"
            
            cur.execute(update_core, tuple(params))
            print(f"  [SUCCESS] {db} pharmacy record updated (State: uninstalled, CategoryID: {cat_id})")

            # 3. Clear ALL 'Upgrading' locks to stop the infinite "Upgrading" UI
            cur.execute("UPDATE ir_module_module SET state = 'uninstalled' WHERE state = 'to install'")
            cur.execute("UPDATE ir_module_module SET state = 'installed' WHERE state IN ('to upgrade', 'to remove')")
            
            cur.close()
            conn.close()
        except Exception as e:
            print(f"  [ERROR] {db}: {e}")

if __name__ == "__main__":
    final_industry_fix()

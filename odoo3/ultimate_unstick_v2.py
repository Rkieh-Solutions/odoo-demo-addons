import psycopg2
import json

def ultimate_unstick():
    databases = [
        'pharmacy', 'phar', 'odoo', 'Restaurant', 'admin', 
        'newdatabase', 'joiner', 'school_db', 'supermaret', 
        'supermarket', 'supermarket1', 'supermaret1', 
        'supermarket2', 'joinery_db'
    ]
    
    for db in databases:
        print(f"\n--- Cleaning DB: {db} ---")
        try:
            conn = psycopg2.connect(dbname=db, user='postgres', host='localhost')
            conn.autocommit = True
            cur = conn.cursor()
            
            # 1. Force ANY module out of stuck states to resolve 'Invalid Operation'
            cur.execute("UPDATE ir_module_module SET state = 'uninstalled' WHERE state = 'to install'")
            cur.execute("UPDATE ir_module_module SET state = 'installed' WHERE state IN ('to upgrade', 'to remove')")
            
            # 2. Get Category ID safely (handling JSONB name field)
            cur.execute("SELECT id FROM ir_module_category WHERE name->>'en_US' = 'Industry' OR name::text ILIKE '%Industry%' LIMIT 1")
            cat_res = cur.fetchone()
            cat_id = cat_res[0] if cat_res else None
            
            # 3. Reset pharmacy/phar and set category
            if cat_id:
                print(f"  Found Industry category ID: {cat_id}")
                cur.execute("""
                    UPDATE ir_module_module 
                    SET state = 'uninstalled', 
                        category_id = %s,
                        application = true
                    WHERE name IN ('pharmacy', 'phar')
                """, (cat_id,))
            else:
                print("  Industry category not found, skipping category update.")
                cur.execute("""
                    UPDATE ir_module_module 
                    SET state = 'uninstalled', 
                        application = true
                    WHERE name IN ('pharmacy', 'phar')
                """)
            
            # 4. Clear model data for views to ensure fresh upgrade
            cur.execute("DELETE FROM ir_model_data WHERE module IN ('pharmacy', 'phar') AND model = 'ir.ui.view'")
            
            print(f"  [SUCCESS] DB {db} is now clean.")
            
            cur.close()
            conn.close()
        except Exception as e:
            print(f"  [ERROR] {db}: {e}")

if __name__ == "__main__":
    ultimate_unstick()

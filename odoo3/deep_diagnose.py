import psycopg2

def deep_diagnose(db_name):
    print(f"\n--- Deep Diagnose DB: {db_name} ---")
    try:
        conn = psycopg2.connect(dbname=db_name, user='odoo', password='odoo', host='localhost')
        cur = conn.cursor()
        
        # 1. Find views with 'code' in arch
        print("Searching for views with 'code' in arch:")
        cur.execute("SELECT v.id, v.name, d.name, v.model FROM ir_ui_view v LEFT JOIN ir_model_data d ON d.res_id = v.id AND d.model = 'ir.ui.view' WHERE v.arch_db::text LIKE '%field name=\"code\"%'")
        views = cur.fetchall()
        for v in views:
            print(f"  ID: {v[0]} | Name: {v[1]} | XML_ID: {v[2]} | Model: {v[3]}")
            
        # 2. Check ir_model_data for pharmacy_management
        print("\nChecking ir_model_data for 'pharmacy_management':")
        cur.execute("SELECT module, name, model, res_id FROM ir_model_data WHERE module = 'pharmacy_management'")
        data = cur.fetchall()
        for d in data:
            print(f"  Module: {d[0]} | Name: {d[1]} | Model: {d[2]} | ResID: {d[3]}")
            
        # 3. Check ir_module_module for pharmacy_management
        print("\nChecking ir_module_module for 'pharmacy_management':")
        cur.execute("SELECT name, state FROM ir_module_module WHERE name = 'pharmacy_management'")
        mod = cur.fetchone()
        if mod:
            print(f"  Name: {mod[0]} | State: {mod[1]}")
        else:
            print("  No module record found.")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    deep_diagnose('phar')
    deep_diagnose('pharmacy')

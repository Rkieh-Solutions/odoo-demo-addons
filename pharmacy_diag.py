
import psycopg2

def check_pharmacy_status():
    try:
        conn = psycopg2.connect(dbname='pharmacy', user='postgres', host='localhost')
        cur = conn.cursor()
        
        # 1. Module state
        cur.execute("SELECT name, state FROM ir_module_module WHERE name IN ('pharmacy', 'phar');")
        rows = cur.fetchall()
        print(f"--- Module States ---")
        for row in rows:
            print(f"Module: {row[0]} | State: {row[1]}")
            
        # 2. Key View check
        cur.execute("SELECT id, name, active, arch_db::text LIKE '%pharmacy_management%' FROM ir_ui_view WHERE name='product.template.form.pharmacy';")
        res = cur.fetchone()
        print(f"\n--- View status (product.template.form.pharmacy) ---")
        if res:
            print(f"ID: {res[0]} | Name: {res[1]} | Active: {res[2]} | Has Tab: {res[3]}")
        else:
            print("View 'product.template.form.pharmacy' NOT FOUND.")
            
        # 3. POS Templates check
        cur.execute("SELECT id, name, active, arch_db::text LIKE '%phar.ControlButtons%' FROM ir_ui_view WHERE name LIKE '%ControlButtons%';")
        rows = cur.fetchall()
        print(f"\n--- POS ControlButtons Views ---")
        for row in rows:
            print(f"ID: {row[0]} | Name: {row[1]} | Active: {row[2]} | Has Custom Patch: {row[3]}")
            
        # 4. Menu check
        cur.execute("SELECT id, name, active FROM ir_ui_menu WHERE name='Pharmacy' AND parent_id IS NULL;")
        res = cur.fetchone()
        print(f"\n--- Top Menu status ---")
        if res:
            print(f"ID: {res[0]} | Name: {res[1]} | Active: {res[2]}")
        else:
            print("Top menu 'Pharmacy' NOT FOUND.")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    check_pharmacy_status()

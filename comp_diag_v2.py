
import psycopg2

def diagnose():
    db = 'pharmacy'
    print(f"--- Diagnosing Database: {db} ---")
    try:
        conn = psycopg2.connect(dbname=db, user='postgres', host='localhost')
        cur = conn.cursor()
        
        # 1. Module States
        print("\n[Module States]")
        cur.execute("SELECT name, state FROM ir_module_module WHERE name IN ('phar', 'pharmacy');")
        rows = cur.fetchall()
        for row in rows:
            print(f"Name: {row[0]} | State: {row[1]}")
            
        # 2. Check ANY non-clean module states (ALL modules)
        print("\n[All Non-Clean States]")
        cur.execute("SELECT name, state FROM ir_module_module WHERE state NOT IN ('installed', 'uninstalled', 'uninstallable');")
        stuck = cur.fetchall()
        print(f"Stuck modules: {stuck}")
        
        # 3. Check Menus
        print("\n[Menus ILIKE %phar% or %pharmacy%]")
        cur.execute("SELECT id, name, parent_id FROM ir_ui_menu WHERE name ILIKE '%phar%' OR name ILIKE '%pharmacy%';")
        menus = cur.fetchall()
        for menu in menus:
            print(f"ID: {menu[0]} | Name: {menu[1]} | Parent: {menu[2]}")
            
        # 4. Check ir_model_data
        print("\n[ir_model_data for 'phar' module]")
        cur.execute("SELECT count(*) FROM ir_model_data WHERE module = 'phar';")
        mcount = cur.fetchone()[0]
        print(f"Records for 'phar': {mcount}")
        
        cur.execute("SELECT count(*) FROM ir_model_data WHERE module = 'pharmacy';")
        mcount_new = cur.fetchone()[0]
        print(f"Records for 'pharmacy': {mcount_new}")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    diagnose()

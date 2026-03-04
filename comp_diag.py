
import psycopg2
import json

def diagnose():
    db = 'pharmacy'
    print(f"--- Diagnosing Database: {db} ---")
    try:
        conn = psycopg2.connect(dbname=db, user='postgres', host='localhost')
        cur = conn.cursor()
        
        # 1. Check Module States
        print("\n[Module States]")
        cur.execute("SELECT name, state, latest_version, summary FROM ir_module_module WHERE name IN ('phar', 'pharmacy');")
        rows = cur.fetchall()
        for row in rows:
            print(f"Name: {row[0]} | State: {row[1]} | Version: {row[2]} | Summary: {row[3]}")
            
        # 2. Check ANY non-clean module states
        print("\n[Non-Clean States (Any Module)]")
        cur.execute("SELECT name, state FROM ir_module_module WHERE state NOT IN ('installed', 'uninstalled', 'uninstallable');")
        stuck = cur.fetchall()
        print(f"Stuck modules: {stuck}")
        
        # 3. Check for menus named 'phar' or related to 'phar'
        print("\n[Menus related to 'phar']")
        cur.execute("SELECT id, name, parent_id, complete_name FROM ir_ui_menu WHERE name ILIKE '%phar%' OR complete_name ILIKE '%phar%';")
        menus = cur.fetchall()
        for menu in menus:
            print(f"ID: {menu[0]} | Name: {menu[1]} | Parent: {menu[2]} | Path: {menu[3]}")
            
        # 4. Check ir_model_data for 'phar' references
        print("\n[ir_model_data for 'phar' module]")
        cur.execute("SELECT count(*) FROM ir_model_data WHERE module = 'phar';")
        mdata_count = cur.fetchone()[0]
        print(f"Number of records in ir_model_data for module 'phar': {mdata_count}")
        
        if mdata_count > 0:
            cur.execute("SELECT name, model, res_id FROM ir_model_data WHERE module = 'phar' LIMIT 10;")
            mdata_rows = cur.fetchall()
            for row in mdata_rows:
                print(f"Name: {row[0]} | Model: {row[1]} | Res ID: {row[2]}")
                
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    diagnose()

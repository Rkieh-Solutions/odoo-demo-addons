
import psycopg2

def deep_cleanup():
    db = 'pharmacy'
    print(f"--- Deep Cleanup of Database: {db} ---")
    try:
        conn = psycopg2.connect(dbname=db, user='postgres', host='localhost')
        conn.autocommit = True
        cur = conn.cursor()
        
        # 1. Delete ir_model_data for 'phar'
        cur.execute("DELETE FROM ir_model_data WHERE module = 'phar';")
        print(f"Deleted {cur.rowcount} records from ir_model_data for module 'phar'.")
        
        # 2. Delete the old menus directly (IDs from diagnostic)
        # Note: We use IDs to be precise, but also by name if they are orphans
        cur.execute("DELETE FROM ir_ui_menu WHERE id IN (565, 566, 567);")
        print(f"Deleted {cur.rowcount} old 'phar' menus.")
        
        # 3. Delete the 'phar' module record
        cur.execute("DELETE FROM ir_module_module WHERE name = 'phar';")
        print(f"Deleted 'phar' module record.")
        
        # 4. Final check for stuck states
        cur.execute("UPDATE ir_module_module SET state = 'uninstalled' WHERE state NOT IN ('installed', 'uninstalled', 'uninstallable');")
        print(f"Ensured no modules are stuck (Reset {cur.rowcount}).")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error during deep cleanup: {e}")

if __name__ == "__main__":
    deep_cleanup()

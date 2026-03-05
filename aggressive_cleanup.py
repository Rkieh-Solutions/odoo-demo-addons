
import psycopg2

def final_cleanup():
    db = 'pharmacy'
    print(f"--- Final Aggressive Cleanup of Database: {db} ---")
    try:
        conn = psycopg2.connect(dbname=db, user='postgres', host='localhost')
        conn.autocommit = True
        cur = conn.cursor()
        
        # 1. Kill other connections to avoid locks
        cur.execute("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = %s AND pid <> pg_backend_pid();", (db,))
        print(f"Terminated {cur.rowcount} other connections.")
        
        # 2. Delete module records
        cur.execute("DELETE FROM ir_module_module WHERE name ILIKE '%phar%';")
        print(f"Deleted {cur.rowcount} module records matching '%phar%'.")
        
        # 3. Delete model data
        cur.execute("DELETE FROM ir_model_data WHERE module ILIKE '%phar%';")
        print(f"Deleted {cur.rowcount} model data records matching '%phar%'.")
        
        # 4. Correct 'pharmacy' module state
        cur.execute("UPDATE ir_module_module SET state = 'uninstalled' WHERE name = 'pharmacy';")
        print("Set 'pharmacy' module to 'uninstalled' for a clean re-install.")
        
        # 5. Clear all transitioning states
        cur.execute("UPDATE ir_module_module SET state = 'uninstalled' WHERE state NOT IN ('installed', 'uninstalled', 'uninstallable');")
        print(f"Reset {cur.rowcount} transitioning states.")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    final_cleanup()

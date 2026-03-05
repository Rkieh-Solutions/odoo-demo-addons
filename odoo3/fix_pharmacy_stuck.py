import psycopg2
import sys

def clear_module_operations(db_name):
    try:
        print(f"Connecting to database: {db_name}...")
        conn = psycopg2.connect(
            dbname=db_name,
            user="odoo",
            password="odoo",
            host="localhost"
        )
        conn.autocommit = True
        cur = conn.cursor()

        print("Clearing stuck module operations...")
        
        # Reset any module stuck in upgrading/to upgrade/to install/to remove state
        cur.execute("UPDATE ir_module_module SET state = 'installed' WHERE state IN ('to upgrade', 'to remove', 'upgrading');")
        cur.execute("UPDATE ir_module_module SET state = 'uninstalled' WHERE state IN ('to install');")
        
        # Specifically target the pharmacy module if it's acting up
        cur.execute("UPDATE ir_module_module SET state = 'installed' WHERE name = 'pharmacy' AND state != 'installed';")

        print("Module states reset. The module should no longer be stuck in 'Upgrading'.")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error connecting to database {db_name}: {e}")

if __name__ == "__main__":
    db_name = "pharmacy" if len(sys.argv) < 2 else sys.argv[1]
    clear_module_operations(db_name)

import psycopg2

def clear_module_operations():
    try:
        conn = psycopg2.connect(
            dbname="pharmacy",
            user="odoo",
            password="odoo",
            host="localhost"
        )
        conn.autocommit = True
        cur = conn.cursor()

        print("Clearing stuck module operations...")
        cur.execute("UPDATE ir_module_module SET state = 'installed' WHERE state IN ('to upgrade', 'to remove');")
        cur.execute("UPDATE ir_module_module SET state = 'uninstalled' WHERE state IN ('to install');")
        
        # Explicitly make sure phar is marked uninstalled so the user can click "Activate" cleanly
        cur.execute("UPDATE ir_module_module SET state = 'uninstalled' WHERE name = 'phar';")

        print("Module states reset. You can now activate modules from the UI.")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error connecting to database: {e}")

if __name__ == "__main__":
    clear_module_operations()

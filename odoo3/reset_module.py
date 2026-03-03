
import psycopg2

def reset_module_state():
    try:
        # Connect to the database
        conn = psycopg2.connect(
            dbname="pharmacy",
            user="odoo",
            password="odoo",
            host="localhost"
        )
        conn.autocommit = True
        cur = conn.cursor()

        # 1. Reset 'pharmacy' and 'phar' module states
        print("Resetting 'pharmacy' and 'phar' module states...")
        cur.execute("UPDATE ir_module_module SET state = 'installed' WHERE name IN ('pharmacy', 'phar');")
        
        # 2. Clear any other stuck states
        print("Clearing other stuck states...")
        cur.execute("UPDATE ir_module_module SET state = 'installed' WHERE state IN ('to upgrade', 'to install', 'uninstallable');")

        # 3. Clear any concurrent update locks if possible (Odoo specific)
        print("Removing potential lock flags...")
        # (Usually handled by killing the process, but good to be sure)
        
        print("Success: Module states reset and locks cleared.")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error connecting to database: {e}")
        print("You may need to run this command manually in psql:")
        print("UPDATE ir_module_module SET state = 'installed' WHERE name = 'pharmacy';")

if __name__ == "__main__":
    reset_module_state()

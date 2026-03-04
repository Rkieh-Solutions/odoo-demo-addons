import psycopg2

def reset_module_state():
    try:
        conn = psycopg2.connect(
            dbname="pharmacy",
            user="odoo",
            password="odoo",
            host="localhost"
        )
        conn.autocommit = True
        cur = conn.cursor()

        print("Setting 'pharmacy' to 'to remove'...")
        cur.execute("UPDATE ir_module_module SET state = 'to remove' WHERE name = 'pharmacy';")
        
        print("Setting 'phar' to 'to upgrade'...")
        cur.execute("UPDATE ir_module_module SET state = 'to upgrade' WHERE name = 'phar';")
        
        print("Success: Module states updated.")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error connecting to database: {e}")

if __name__ == "__main__":
    reset_module_state()

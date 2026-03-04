import psycopg2

def check_modules():
    try:
        conn = psycopg2.connect(
            dbname="pharmacy",
            user="odoo",
            password="odoo",
            host="localhost"
        )
        conn.autocommit = True
        cur = conn.cursor()

        print("Checking module states...")
        cur.execute("SELECT name, state FROM ir_module_module WHERE name IN ('phar', 'pharmacy');")
        rows = cur.fetchall()
        for row in rows:
            print(f"Module: {row[0]} | State: {row[1]}")
            
            # If phar is not installed, install it!
            if row[0] == 'phar' and row[1] != 'installed':
               print("Fixing phar state to 'installed'...")
               cur.execute("UPDATE ir_module_module SET state = 'installed' WHERE name = 'phar';")

        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error connecting to database: {e}")

if __name__ == "__main__":
    check_modules()

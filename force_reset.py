
import psycopg2

def force_reset_modules():
    try:
        conn = psycopg2.connect(dbname='pharmacy', user='postgres', host='localhost')
        conn.autocommit = True
        cur = conn.cursor()
        
        # Reset any module stuck in transition
        query = """
            UPDATE ir_module_module 
            SET state = 'uninstalled' 
            WHERE state IN ('to install', 'to upgrade', 'to remove', 'uninstalling', 'upgrading', 'installing')
            AND name IN ('phar', 'pharmacy');
        """
        cur.execute(query)
        print(f"Updated {cur.rowcount} modules to 'uninstalled' state.")
        
        # Double check current states
        cur.execute("SELECT name, state FROM ir_module_module WHERE name IN ('phar', 'pharmacy');")
        rows = cur.fetchall()
        for row in rows:
            print(f"Module: {row[0]} | Current State: {row[1]}")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    force_reset_modules()

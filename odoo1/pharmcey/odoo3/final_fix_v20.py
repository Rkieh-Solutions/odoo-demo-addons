import psycopg2

def deep_repair():
    print("Starting ULTIMATE RESCUE for Pharmacy Module (Odoo 20)...")
    try:
        conn = psycopg2.connect(
            dbname="pharmacy",
            user="odoo",
            password="odoo",
            host="localhost"
        )
        conn.autocommit = True
        cur = conn.cursor()

        # 1. Reset stuck states for both possible names
        print("- Resetting module states (Force Uninstalled)...")
        cur.execute("UPDATE ir_module_module SET state = 'uninstalled' WHERE name IN ('pharmacy', 'phar');")
        cur.execute("UPDATE ir_module_module SET state = 'uninstalled' WHERE state IN ('to upgrade', 'to install', 'to remove');")

        # 2. DELETE ALL pharmacy-related views (Nuclear Option)
        print("- Purging ALL pharmacy and phar views to avoid 'field code' errors...")
        
        # Delete by model data (External IDs)
        cur.execute("DELETE FROM ir_model_data WHERE module IN ('pharmacy', 'phar') AND model = 'ir.ui.view';")
        
        # Delete by Name pattern (Catch anything mentioning pharmacy or inherit.composition)
        cur.execute("DELETE FROM ir_ui_view WHERE name ILIKE '%pharmacy%' OR name ILIKE '%inherit.composition%';")

        print("\nULTIMATE RESCUE COMPLETE.")
        print("NEXT STEPS:")
        print("1. Replace the 'pharmacy' folder on your server with the NEW ZIP content.")
        print("2. RESTART your Odoo service.")
        print("3. Go to Apps -> Search 'Pharmacy Management' -> Click ACTIVATE.")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"ERROR: {e}")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    deep_repair()

import psycopg2

def ultimate_nuclear_fix():
    print("Starting Ultimate Nuclear Fix (JSONB Compatible)...")
    try:
        conn = psycopg2.connect(dbname='postgres', user='postgres', host='localhost')
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute("SELECT datname FROM pg_database WHERE datistemplate = false AND datname != 'postgres';")
        dbs = [r[0] for r in cur.fetchall()]
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Failed to list dbs: {e}")
        dbs = ['pharmacy', 'phar', 'odoo', 'odoo3', 'test', 'demo']

    for db in dbs:
        print(f"--- Processing DB: {db} ---")
        try:
            conn = psycopg2.connect(dbname=db, user='postgres', host='localhost')
            conn.autocommit = True
            cur = conn.cursor()

            # 1. Reset pharmacy module state
            cur.execute("UPDATE ir_module_module SET state = 'to upgrade', latest_version = '20.0.1.0.0' WHERE name = 'pharmacy'")
            print(f"  [STATE] Pharmacy set to 'to upgrade'")

            # 2. Force replacement of 'code' with 'default_code' in ALL arches (Casting JSONB to TEXT)
            cur.execute("SELECT id, CAST(arch_db AS TEXT) FROM ir_ui_view WHERE CAST(arch_db AS TEXT) LIKE '%name=\"code\"%' OR CAST(arch_db AS TEXT) LIKE '%name=''code''%'")
            views = cur.fetchall()
            for v_id, arch_text in views:
                new_arch = arch_text.replace('name="code"', 'name="default_code"')
                new_arch = new_arch.replace("name='code'", "name='default_code'")
                cur.execute("UPDATE ir_ui_view SET arch_db = %s WHERE id = %s", (new_arch, v_id))
                print(f"  [ARCH] Cleaned view {v_id}")

            # 3. Clean ir_model_data
            cur.execute("DELETE FROM ir_model_data WHERE module='pharmacy' AND model='ir.ui.view'")
            print(f"  [DATA] Cleaned ir_model_data views")

            cur.close()
            conn.close()
        except Exception as e:
            print(f"  [SKIP] {db}: {e}")

if __name__ == "__main__":
    ultimate_nuclear_fix()

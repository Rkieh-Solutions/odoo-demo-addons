
import psycopg2

def check_field():
    try:
        conn = psycopg2.connect(dbname='pharmacy', user='postgres', host='localhost')
        cur = conn.cursor()
        
        # Check if field exists in ir_model_fields
        cur.execute("SELECT id, state FROM ir_model_fields WHERE model='product.template' AND name='code';")
        res = cur.fetchone()
        if res:
            print(f"FIELD 'code' exists in ir_model_fields. ID: {res[0]}, State: {res[1]}")
        else:
            print("FIELD 'code' NOT FOUND in ir_model_fields.")
            
        # Check if column exists in product_template
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'product_template' AND column_name = 'code';")
        if cur.fetchone():
            print("COLUMN 'code' exists in table 'product_template'.")
        else:
            print("COLUMN 'code' NOT FOUND in table 'product_template'.")
            
        # Check active views with 'code'
        print("\nActive views with 'code':")
        cur.execute("SELECT id, name, model FROM ir_ui_view WHERE (arch_db::text LIKE '%name=\"code\"%' OR arch_db::text LIKE '%name=''code''%') AND active = true;")
        rows = cur.fetchall()
        for row in rows:
             print(f"ID {row[0]}: {row[1]} ({row[2]})")
             
        cur.close()
        conn.close()
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    check_field()

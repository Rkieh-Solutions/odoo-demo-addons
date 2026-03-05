
import psycopg2

def find_phar_module():
    try:
        conn = psycopg2.connect(dbname='postgres', user='postgres', host='localhost')
        cur = conn.cursor()
        cur.execute("SELECT datname FROM pg_database WHERE datistemplate = false AND datname != 'postgres';")
        dbs = [row[0] for row in cur.fetchall()]
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error listing databases: {e}")
        return

    for db in dbs:
        try:
            conn = psycopg2.connect(dbname=db, user='postgres', host='localhost')
            cur = conn.cursor()
            cur.execute("SELECT name, state, latest_version FROM ir_module_module WHERE name = 'phar';")
            row = cur.fetchone()
            if row:
                print(f"DB: {db} | Module: {row[0]} | State: {row[1]} | Version: {row[2]}")
            cur.close()
            conn.close()
        except:
            pass

if __name__ == "__main__":
    find_phar_module()

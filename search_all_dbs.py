
import psycopg2

def search_all_dbs():
    try:
        conn = psycopg2.connect(dbname='postgres', user='postgres', host='localhost')
        cur = conn.cursor()
        cur.execute("SELECT datname FROM pg_database WHERE datistemplate = false AND datname != 'postgres';")
        dbs = [row[0] for row in cur.fetchall()]
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")
        return

    for db in dbs:
        try:
            conn = psycopg2.connect(dbname=db, user='postgres', host='localhost')
            cur = conn.cursor()
            # Search for ANY module with phar in the name or translated name
            cur.execute("""
                SELECT name, state 
                FROM ir_module_module 
                WHERE name ILIKE '%phar%' OR summary::text ILIKE '%phar%';
            """)
            rows = cur.fetchall()
            for row in rows:
                print(f"DATABASE: {db} | Name: {row[0]} | State: {row[1]}")
            cur.close()
            conn.close()
        except:
            pass

if __name__ == "__main__":
    search_all_dbs()

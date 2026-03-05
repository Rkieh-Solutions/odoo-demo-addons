#!/usr/bin/env python3
"""
Run this script ON YOUR SERVER to fix the stuck 'Upgrading' module state.

Step 1: Copy this file to your Odoo server
Step 2: Run: python3 fix_stuck.py
Step 3: Restart your Odoo service
"""
import subprocess, sys

def get_db_name():
    """Try to auto-detect the Odoo database name from odoo.conf"""
    import os, configparser
    conf_paths = [
        '/etc/odoo/odoo.conf',
        '/etc/odoo.conf',
        '/opt/odoo/odoo.conf',
    ]
    for p in conf_paths:
        if os.path.exists(p):
            cfg = configparser.ConfigParser()
            cfg.read(p)
            db = cfg.get('options', 'db_name', fallback=None)
            if db:
                return db
    return None

def run(db_name='pharmacy', user='odoo', password='odoo', host='localhost', port=5432):
    try:
        import psycopg2
    except ImportError:
        print("Installing psycopg2...")
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'psycopg2-binary', '-q'])
        import psycopg2

    print(f"Connecting to database: {db_name}")
    conn = psycopg2.connect(dbname=db_name, user=user, password=password, host=host, port=port)
    conn.autocommit = True
    cur = conn.cursor()

    # Show current states
    cur.execute("SELECT name, state FROM ir_module_module WHERE name IN ('pharmacy','phar');")
    print("Current states:", cur.fetchall())

    # Force reset
    cur.execute("UPDATE ir_module_module SET state='installed' WHERE name='pharmacy' AND state IN ('to upgrade','to remove','to install');")
    cur.execute("UPDATE ir_module_module SET state='uninstalled' WHERE name='phar';")

    cur.execute("SELECT name, state FROM ir_module_module WHERE name IN ('pharmacy','phar');")
    print("Fixed states:", cur.fetchall())

    cur.close()
    conn.close()
    print("\nDONE. Please restart your Odoo service now.")

if __name__ == '__main__':
    detected_db = get_db_name()
    if detected_db:
        print(f"Auto-detected DB: {detected_db}")
    db = detected_db or input("Enter database name [pharmacy]: ").strip() or 'pharmacy'
    user = input("DB username [odoo]: ").strip() or 'odoo'
    passwd = input("DB password [odoo]: ").strip() or 'odoo'
    run(db_name=db, user=user, password=passwd)

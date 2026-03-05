"""
Step 1: List all available databases on the remote server.
Step 2: Then use fix_remote_v2.py with the correct DB name to fix the stuck module.
"""
import xmlrpc.client

SERVER = "https://odoo3.rkiehsolutions.com"

print(f"Listing databases on {SERVER} ...\n")
db_proxy = xmlrpc.client.ServerProxy(f"{SERVER}/xmlrpc/2/db")
try:
    dbs = db_proxy.list()
    print("Available databases:")
    for db in dbs:
        print(f"  - {db}")
    print("\nNow edit fix_remote_v2.py with the correct DB name and run it.")
except Exception as e:
    print(f"Error: {e}")
    print("\nThe server might hide the DB list. Try fix_remote_v2.py with different DB names.")

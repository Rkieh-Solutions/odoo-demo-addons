import xmlrpc.client, sys

SERVER = "https://odoo3.rkiehsolutions.com"
DB     = "odoo3"  # correct database name
USER   = "admin"
PASS   = input("Enter Odoo ADMIN password for odoo3.rkiehsolutions.com: ").strip()

print(f"\nConnecting to {SERVER} / database: {DB} ...")
common = xmlrpc.client.ServerProxy(f"{SERVER}/xmlrpc/2/common")
models = xmlrpc.client.ServerProxy(f"{SERVER}/xmlrpc/2/object")

try:
    uid = common.authenticate(DB, USER, PASS, {})
    if not uid:
        print("Login failed. Check your password.")
        sys.exit(1)
    print(f"Logged in as UID {uid}")

    # Find stuck module
    ids = models.execute_kw(DB, uid, PASS,
        'ir.module.module', 'search',
        [[['name', '=', 'pharmacy']]])
    
    if not ids:
        print("Module 'pharmacy' not found.")
        sys.exit(1)

    info = models.execute_kw(DB, uid, PASS,
        'ir.module.module', 'read', [ids, ['name', 'state']])
    print(f"Current state: {info[0]['state']}")

    # Reset to installed
    models.execute_kw(DB, uid, PASS,
        'ir.module.module', 'write',
        [ids, {'state': 'installed'}])

    info = models.execute_kw(DB, uid, PASS,
        'ir.module.module', 'read', [ids, ['name', 'state']])
    print(f"FIXED! New state: {info[0]['state']}")
    print("\nNow hard-refresh your browser (Ctrl+F5) to see the change.")

except Exception as e:
    print(f"Error: {e}")

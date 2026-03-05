"""
FINAL FIX: Resets stuck pharmacy module on odoo3.rkiehsolutions.com
Run this on your local machine. Enter your Odoo admin password when asked.
"""
import xmlrpc.client, sys

SERVER = "https://odoo3.rkiehsolutions.com"
DB     = "odoo3"

print("="*50)
print("PHARMACY MODULE STUCK FIX")
print("="*50)
print(f"Server: {SERVER}")
print(f"Database: {DB}")
print()
USER = input("Enter your Odoo admin username [admin]: ").strip() or "admin"
PASS = input("Enter your Odoo admin password: ").strip()

common = xmlrpc.client.ServerProxy(f"{SERVER}/xmlrpc/2/common")
models = xmlrpc.client.ServerProxy(f"{SERVER}/xmlrpc/2/object")

try:
    uid = common.authenticate(DB, USER, PASS, {})
    if not uid:
        print("\nLOGIN FAILED. Check your username and password.")
        sys.exit(1)
    print(f"\nLogged in successfully!")

    # Find pharmacy module
    ids = models.execute_kw(DB, uid, PASS, 'ir.module.module', 'search', [[['name', '=', 'pharmacy']]])
    info = models.execute_kw(DB, uid, PASS, 'ir.module.module', 'read', [ids, ['name', 'state']])
    print(f"Pharmacy module current state: {info[0]['state']}")

    # Reset to installed
    models.execute_kw(DB, uid, PASS, 'ir.module.module', 'write', [ids, {'state': 'installed'}])
    info = models.execute_kw(DB, uid, PASS, 'ir.module.module', 'read', [ids, ['name', 'state']])
    print(f"Pharmacy module FIXED state: {info[0]['state']}")
    print("\nSUCCESS! Hard-refresh your browser now (Ctrl+F5).")

except Exception as e:
    print(f"\nError: {e}")
    print("\nNote: If 'Login failed', try username 'administrator' or contact your hosting provider.")

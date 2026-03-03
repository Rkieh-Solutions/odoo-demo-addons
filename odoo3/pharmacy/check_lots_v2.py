import os
import sys

# Add Odoo to path
odoo_path = 'c:/Users/Sub101/Desktop/odoo'
sys.path.append(odoo_path)

# Mocking the environment to run a standalone script
os.environ['TZ'] = 'UTC'
import odoo
from odoo import api, SUPERUSER_ID

def check_lots():
    # Setup Odoo config
    odoo.tools.config['addons_path'] = 'c:/Users/Sub101/Desktop/odoo/addons,c:/Users/Sub101/Desktop/phar'
    db_name = 'phar'
    
    try:
        registry = odoo.registry(db_name)
        with registry.cursor() as cr:
            env = api.Environment(cr, SUPERUSER_ID, {})
            
            # Find lots starting with HIC
            lots = env['stock.lot'].search([('name', 'ilike', 'HIC%')], limit=10)
            
            print(f"--- DATABASE LOT CHECK ---")
            if lots:
                print(f"Found {len(lots)} lots starting with 'HIC':")
                for lot in lots:
                    print(f"Lot Name: {lot.name}")
                    print(f"  - Product: {lot.product_id.display_name}")
                    print(f"  - Expiration Date: {lot.expiration_date}")
                    print(f"  - Use Date: {getattr(lot, 'use_date', 'N/A')}")
                    print(f"  - Removal Date: {getattr(lot, 'removal_date', 'N/A')}")
            else:
                print("No lots starting with 'HIC' found.")

            # Find any lots that DO have expiration dates to prove it works
            lots_with_exp = env['stock.lot'].search([('expiration_date', '!=', False)], limit=5)
            if lots_with_exp:
                print(f"\nExample lots WITH expiration dates in DB:")
                for lot in lots_with_exp:
                    print(f"Lot Name: {lot.name}")
                    print(f"  - Product: {lot.product_id.display_name}")
                    print(f"  - Exp: {lot.expiration_date}")
            else:
                print("\nCRITICAL: No lots in the entire database have an expiration date!")
                    
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_lots()

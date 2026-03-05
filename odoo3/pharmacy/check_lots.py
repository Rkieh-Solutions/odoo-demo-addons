import os
import sys

# Add Odoo to path
odoo_path = 'c:/Users/Sub101/Desktop/odoo'
sys.path.append(odoo_path)

import odoo
from odoo import api, SUPERUSER_ID

def check_lots():
    odoo.tools.config['addons_path'] = 'c:/Users/Sub101/Desktop/odoo/addons,c:/Users/Sub101/Desktop/phar'
    db_name = 'phar'
    
    try:
        registry = odoo.registry(db_name)
        with registry.cursor() as cr:
            env = api.Environment(cr, SUPERUSER_ID, {})
            
            # Find lots starting with HIC
            lots = env['stock.lot'].search([('name', 'ilike', 'HIC%')], limit=10)
            
            print(f"Found {len(lots)} lots starting with HIC:")
            for lot in lots:
                print(f"Name: {lot.name}, Expiration Date: {lot.expiration_date}")
                
            if not lots:
                # Find any lots that DO have expiration dates
                lots_with_exp = env['stock.lot'].search([('expiration_date', '!=', False)], limit=5)
                print(f"\nExample lots WITH expiration dates:")
                for lot in lots_with_exp:
                    print(f"Name: {lot.name}, Product: {lot.product_id.display_name}, Exp: {lot.expiration_date}")
                    
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_lots()

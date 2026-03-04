import sys
import os

# Add Odoo path
sys.path.append(r'C:\Users\Sub101\Desktop\odoo\odoo')

import odoo
from odoo.tools import config

# Initialize config
config.parse_config(['-c', r'C:\Users\Sub101\Desktop\odoo\odoo\odoo.conf'])

# Connect to database and initialize environment
odoo.cli.server.report_configuration()
registry = odoo.registry('pharmacy')

with registry.cursor() as cr:
    env = odoo.api.Environment(cr, odoo.SUPERUSER_ID, {})
    
    # Get modules
    pharmacy_mod = env['ir.module.module'].search([('name', '=', 'pharmacy')])
    phar_mod = env['ir.module.module'].search([('name', '=', 'phar')])
    
    # Uninstall pharmacy
    if pharmacy_mod and pharmacy_mod.state == 'installed':
        print("Uninstalling pharmacy module...")
        pharmacy_mod.button_immediate_uninstall()
    elif pharmacy_mod:
        print(f"Pharmacy module state: {pharmacy_mod.state}")
        # Force it if stuck
        pharmacy_mod.state = 'uninstalled'

    # Install/upgrade phar
    if phar_mod:
        print(f"Phar module state: {phar_mod.state}")
        if phar_mod.state != 'installed':
            print("Installing phar module...")
            phar_mod.button_immediate_install()
        else:
            print("Upgrading phar module...")
            phar_mod.button_immediate_upgrade()
    
    env.cr.commit()
    print("Done handling modules.")

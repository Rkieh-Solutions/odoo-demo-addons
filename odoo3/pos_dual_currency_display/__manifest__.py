{
    'name': 'POS Dual Currency Display',
    'version': '1.0.0',
    'category': 'Point of Sale',
    'summary': 'Display a secondary currency alongside the primary currency in the POS interface.',
    'description': """
POS Dual Currency Display
=========================

Adds a configurable secondary currency display to the Odoo Point of Sale.

Features:
- Show a secondary currency on product cards, order lines, totals, and the payment screen.
- Secondary currency total is also displayed on the printed receipt.
- Uses Odoo's built-in currency rates for automatic conversion.
- Configurable per POS: enable/disable and choose the secondary currency from POS settings.
- Supports any active or inactive currency defined in Odoo.
- Clean, non-intrusive display that does not affect backend calculations, invoices, or quotations.
    """,
    'author': 'Rkiehsolutions',
    'license': 'LGPL-3',
    'depends': ['point_of_sale'],
    'data': [
        'views/pos_config_views.xml',
        'views/res_config_settings_views.xml',
    ],
    'assets': {
        'point_of_sale._assets_pos': [
            'pos_dual_currency_display/static/src/js/dual_currency_service.js',
            'pos_dual_currency_display/static/src/js/pos_patches.js',
            'pos_dual_currency_display/static/src/xml/pos_dual_currency.xml',
        ],
    },
    'installable': True,
    'application': False,
}

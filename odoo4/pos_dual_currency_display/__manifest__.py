{
    'name': 'POS Dual Currency Display',
    'version': '1.0.0',
    'category': 'Point of Sale',
    'summary': 'Display dual currency in POS without backend impact.',
    'description': """
        Dual Currency for POS (Odoo 19)
        - Strictly POS only.
        - Inherits Odoo Currencies.
        - Error-free production ready.
    """,
    'author': 'Rkieh-Solutions',
    'depends': ['point_of_sale'],
    'data': [
        'views/pos_config_views.xml',
        'views/res_config_settings_views.xml',
    ],
    'assets': {
        'point_of_sale.assets': [
            'pos_dual_currency_display/static/src/js/dual_currency_service.js',
            'pos_dual_currency_display/static/src/js/pos_patches.js',
            'pos_dual_currency_display/static/src/xml/pos_dual_currency.xml',
        ],
    },
    'installable': True,
    'application': False,
    'license': 'LGPL-3',
}

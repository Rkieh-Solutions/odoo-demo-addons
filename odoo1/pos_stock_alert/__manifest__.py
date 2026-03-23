{
    'name': 'POS Stock Alert',
    'version': '19.0.1.7.0',
    'category': 'Industry',
    'sequence': 1,
    'summary': 'Advanced POS Stock Notifications & Low Stock Warnings',
    'description': """
        Real-time Stock Awareness for POS:
        - Critical Out-of-Stock alerts (triggers at <= 0).
        - Customizable Low-Stock warnings.
        - Global and product-specific threshold management.
        - Intelligent stock location detection with global fallback.
    """,
    'author': 'Rkiehsoloutions',
    'depends': ['base', 'product', 'stock', 'point_of_sale', 'product_expiry', 'sale', 'purchase'],
    'data': [
        'views/product_template_views.xml',
        'views/pos_config_views.xml',
        'views/res_config_settings_views.xml',
    ],
    'assets': {
        'point_of_sale._assets_pos': [
            'pos_stock_alert/static/src/js/pos_stock_alert.js',
        ],
    },
    'installable': True,
    'application': True,
    'web_icon': 'pos_stock_alert,static/description/icon_new.png',
    'auto_install': False,
    'license': 'LGPL-3',
}

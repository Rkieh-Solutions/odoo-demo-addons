{
    'name': 'POS Stock Alert',
    'version': '19.0.1.0.0',
    'category': 'Industry',
    'sequence': 5,
    'summary': 'Alerts in POS when stock reaches a threshold',
    'depends': ['base', 'point_of_sale', 'stock'],
    'data': [
        'views/product_template_views.xml',
        'views/pos_config_views.xml',
    ],
    'assets': {
        'point_of_sale._assets_pos': [
            'pos_stock_alert/static/src/js/**/*',
        ],
    },
    'installable': True,
    'application': True,
    'auto_install': False,
    'license': 'LGPL-3',
}

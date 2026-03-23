{
    'name': 'POS Stock Alert',
    'version': '20.0.1.0.0',
    'category': 'Industry',
    'summary': 'Alerts in POS when stock reaches a threshold',
    'depends': ['point_of_sale', 'stock'],
    'data': [
        'views/product_template_views.xml',
    ],
    'assets': {
        'point_of_sale._assets_pos': [
            'pos_stock_alert/static/src/js/**/*',
        ],
    },
    'installable': True,
    'application': True,
    'license': 'LGPL-3',
}

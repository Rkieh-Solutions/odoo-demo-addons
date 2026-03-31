# -*- coding: utf-8 -*-
{
    'name': 'Inventory Extension',
    'version': '19.0.1.0.0',
    'category': 'Industry',
    'author': 'Rkiehsoloutions',
    'sequence': 1,
    'depends': ['base', 'product', 'stock'],
    'data': [
        'views/product_views.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'inventory_extension/static/src/css/product_style.css',
        ],
    },
    'installable': True,
    'application': True,
    'auto_install': False,
    'license': 'LGPL-3',
    'web_icon': 'inventory_extension,static/description/icon.png',
}

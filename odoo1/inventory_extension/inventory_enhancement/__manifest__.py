# -*- coding: utf-8 -*-
{
    'name': 'Inventory Enhancement',
    'version': '19.0.1.0.0',
    'summary': 'Enhanced product image display, Margin and Margin % in Inventory',
    'description': """
        This module enhances the inventory experience by:
        1. Providing a larger product image display with zoom/preview.
        2. Adding Margin and Margin % fields to the product template for better performance tracking.
    """,
    'category': 'Industry',
    'sequence': 1,
    'author': 'Rkiehsoloutions',
    'depends': ['base', 'product', 'stock', 'point_of_sale', 'product_expiry', 'sale', 'purchase'],
    'data': [
        'views/product_views.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'inventory_enhancement/static/src/css/product_style.css',
        ],
    },
    'installable': True,
    'application': True,
    'auto_install': False,
    'license': 'LGPL-3',
    'web_icon': 'inventory_enhancement,static/description/icon.png',
}

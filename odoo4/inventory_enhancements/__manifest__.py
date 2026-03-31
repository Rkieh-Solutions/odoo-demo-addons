
{
    'name': 'Inventory Enhancements',
    'version': '16.0.1.0.0',
    'summary': 'Enhanced product image display, Margin and Margin % in Inventory',
    'description': """
        This module enhances the inventory experience by:
        1. Providing a larger product image display with zoom/preview.
        2. Adding Margin and Margin % fields to the product template for better performance tracking.
    """,
    'category': 'Inventory/Inventory',
    'author': 'Antigravity',
    'sequence': 1,
    'depends': ['product', 'stock'],
    'data': [
        'views/product_views.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'inventory_enhancements/static/src/css/product_style.css',
        ],
    },
    'installable': True,
    'application': True,
    'license': 'LGPL-3',
}
{
    'name': 'phar',
    'version': '19.0.1.0.0',
    'category': 'phar',
    'summary': 'New Standalone Pharmacy Extension',
    'description': """
        A new standalone module for pharmacy related extensions, separate from the main Pharmacy Management system.
    """,
    'author': 'Rkiehsoloutions',
    'depends': ['base', 'product', 'stock', 'point_of_sale'],
    'data': [
        'views/menus.xml',
    ],
    'installable': True,
    'application': True,
    'web_icon': 'phar,static/description/icon.png',
    'license': 'LGPL-3',
}

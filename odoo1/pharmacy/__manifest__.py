{
    'name': 'Pharmacy Management',
    'version': '19.0.1.0.0',
    'category': 'Industry',
    'author': 'Rkieh Solutions',
    'summary': 'Pharmacy Management with Dynamic Box Opening',
    'depends': ['base', 'product', 'stock', 'point_of_sale'],
    'data': [
        'security/ir.model.access.csv',
        'views/product_template_views.xml',
    ],
    'assets': {
        'point_of_sale._assets_pos': [
            'pharmacy/static/src/pos/create_child_product_popup/create_child_product_popup.js',
            'pharmacy/static/src/pos/create_child_product_popup/create_child_product_popup.xml',
            'pharmacy/static/src/js/pos_extension.js',
            'pharmacy/static/src/js/pos_store_patch.js',
        ],
    },
    'installable': True,
    'application': True,
    'web_icon': 'pharmacy,static/description/icon.png',
    'license': 'LGPL-3',
}

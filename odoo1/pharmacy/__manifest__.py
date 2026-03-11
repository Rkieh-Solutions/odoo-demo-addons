{
    'name': 'Pharmacy Management',
    'version': '19.0.1.0.2',
    'category': 'Industry',
    'author': 'Rkieh Solutions',
    'summary': 'Advanced Pharmacy Management with Sale/Purchase integration',
    'depends': ['base', 'product', 'stock', 'point_of_sale', 'sale', 'purchase'],
    'data': [
        'security/ir.model.access.csv',
        'views/cleanup.xml',
        'views/product_template_views.xml',
        'views/sale_order_views.xml',
        'views/master_data_views.xml',
        'views/menus.xml',
    ],
    'assets': {
        'point_of_sale._assets_pos': [
            'pharmacy/static/src/pos/create_child_product_popup/create_child_product_popup.js',
            'pharmacy/static/src/pos/create_child_product_popup/create_child_product_popup.xml',
            'pharmacy/static/src/xml/pos_templates.xml',
            'pharmacy/static/src/js/pos_extension.js',
            'pharmacy/static/src/js/pos_store_patch.js',
        ],
    },
    'installable': True,
    'application': True,
    'license': 'LGPL-3',
}

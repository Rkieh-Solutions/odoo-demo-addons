{
    'name': 'Pharmacy Management',
    'version': '19.0.1.0.0',
    'category': 'Industry',
    'sequence': 1,
    'summary': 'Advanced Pharmacy Management with Box/Envelope Inventory',
    'description': """
        Advanced Pharmaceutical Management System:
        - Advanced POS Substance Search & Substitution: Find alternatives by ingredients/overlap.
        - Box and Envelope inventory tracking: Seamless conversion between bulk and unit sales.
        - Scientific Name, Brand, and Composition management.
        - Stock alerts in POS for low-stock items.
        - Rx Only drug management.
    """,
    'author': 'Rkiehsoloutions',
    'depends': ['base', 'product', 'stock', 'point_of_sale', 'product_expiry'],
    'data': [
        'security/ir.model.access.csv',
        'wizard/pharmacy_substitute_wizard_views.xml',
        'views/product_template_views.xml',
        'views/atc_views.xml',
        'views/composition_views.xml',
        'views/form_views.xml',
        'views/presentation_views.xml',
        'views/product_search_views.xml',
        'views/stratum_views.xml',
        'views/strength_views.xml',
        'views/pharmacy_config_views.xml',
        'views/menus.xml',
        'views/stock_lot_views.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'pharmacy/static/src/js/substitute_handler.js',
        ],
        'point_of_sale._assets_pos': [
            'pharmacy/static/src/css/pharmacy_pos.css',
            'pharmacy/static/src/js/substitute_handler.js',
            'pharmacy/static/src/pos/substance_search_popup/substance_search_popup.js',
            'pharmacy/static/src/js/pos_extension.js',
            'pharmacy/static/src/js/select_lot_popup_patch.js',
            'pharmacy/static/src/js/pos_store_patch.js',
            'pharmacy/static/src/js/order_payment_validation_patch.js',
            'pharmacy/static/src/pos/substance_search_popup/substance_search_popup.xml',
            'pharmacy/static/src/xml/pos_templates.xml',
            'pharmacy/static/src/xml/select_lot_popup_extension.xml',
        ],
    },
    'installable': True,
    'application': True,
    'web_icon': 'pharmacy,static/description/icon.png',
    'auto_install': False,
    'license': 'LGPL-3',
}

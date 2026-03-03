{
    'name': 'Pharmacy Management',
    'version': '17.0.1.1.0',
    'category': 'Pharmacy',
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
    'depends': ['base', 'product', 'stock', 'sale', 'sale_stock', 'purchase', 'purchase_stock', 'point_of_sale', 'product_expiry'],
    'data': [
        'security/ir.model.access.csv',
        'views/menus.xml',
        'wizard/pharmacy_substitute_wizard_views.xml',
        'views/product_template_views.xml',
        'views/sale_order_wizard_views.xml',
        'views/atc_views.xml',
        'views/composition_views.xml',
        'views/form_views.xml',
        'views/presentation_views.xml',
        'views/product_search_views.xml',
        'views/stratum_views.xml',
        'views/strength_views.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'pharmacy_management/static/src/js/substitute_handler.js',
        ],
        'point_of_sale._assets_pos': [
            'pharmacy_management/static/src/css/pharmacy_pos.css',
            'pharmacy_management/static/src/js/SubstanceSearchPopup.js',
            'pharmacy_management/static/src/js/pos_extension.js',
            'pharmacy_management/static/src/js/select_lot_popup_patch.js',
            'pharmacy_management/static/src/js/pos_store_patch.js',
            'pharmacy_management/static/src/js/order_payment_validation_patch.js',
            'pharmacy_management/static/src/xml/SubstanceSearchPopup.xml',
            'pharmacy_management/static/src/xml/pos_templates.xml',
            'pharmacy_management/static/src/xml/select_lot_popup_extension.xml',
        ],
    },
    'installable': True,
    'application': True,
    'web_icon': 'pharmacy_management,static/description/icon.png',
    'auto_install': False,
    'license': 'LGPL-3',
}

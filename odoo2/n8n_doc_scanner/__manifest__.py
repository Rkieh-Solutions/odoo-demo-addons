{
    'name': ' Document Scanner',
    'version': '19.0.1.0',
    'summary': 'Scan documents with the camera and let n8n read them into Odoo',
    'description': """
n8n Document Scanner
====================

Capture a document with your device camera (or upload a photo) directly inside
Odoo, send it to the matching n8n workflow for AI/OCR extraction, and create the
corresponding draft document automatically.

Supported document types (one n8n workflow each):

* Sales Quotation  -> sale.order
* Purchase Order   -> purchase.order
* Receipt          -> account.move (in_receipt / expense)
* Vendor Bill      -> account.move (in_invoice)

Flow
----
1. User takes a photo in Odoo and picks the document type.
2. Odoo POSTs the image (base64) to the configured n8n webhook for that type.
3. n8n reads the document and returns structured JSON.
4. Odoo parses the JSON and creates the matching draft record.

The n8n webhook URLs and the (optional) auth token are configured in
Settings -> n8n Document Scanner.
""",
    'author': 'Rkieh Solutions',
    'website': 'https://odoo2.rkiehsolutions.com',
    'category': 'Productivity/Documents',
    'license': 'LGPL-3',
    'depends': [
        'base',
        'mail',
        'sale_management',
        'purchase',
        'account',
    ],
    'data': [
        'security/ir.model.access.csv',
        'data/ir_sequence.xml',
        'views/doc_scan_views.xml',
        'views/res_config_settings_views.xml',
        'views/menus.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'n8n_doc_scanner/static/src/js/camera_capture.js',
            'n8n_doc_scanner/static/src/xml/camera_capture.xml',
            'n8n_doc_scanner/static/src/scss/camera_capture.scss',
        ],
    },
    'application': True,
    'installable': True,
}

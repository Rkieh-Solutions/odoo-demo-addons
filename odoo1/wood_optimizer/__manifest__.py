{
    'name': 'Wood Optimizer',
    'version': '20.0.1.0.0',
    'category': 'Manufacturing',
    'sequence': 1,
    'summary': 'Advanced Cutting Optimizer for Odoo Manufacturing',
    'depends': ['base', 'web', 'mrp', 'mail'],
    'data': [
        'security/ir.model.access.csv',
        'views/wood_project_views.xml',
        'views/mrp_production_views.xml',
        'views/menus.xml',
        'views/optimizer_templates.xml',
    ],
    'installable': True,
    'application': True,
    'auto_install': False,
    'license': 'LGPL-3',
}

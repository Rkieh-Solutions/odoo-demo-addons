{
    'name': 'WoodCut Optimizer Pro',
    'version': '19.0.1.14.0',
    'sequence': 1,
    'category': 'Manufacturing',
    'summary': 'Advanced Cutting Optimizer for Odoo Manufacturing',
    'depends': ['base', 'web', 'mrp'],
    'data': [
        'security/ir.model.access.csv',
        'views/wood_project_views.xml',
        'views/optimizer_templates.xml',
        'views/mrp_production_views.xml',
        'views/menus.xml',
    ],
    'installable': True,
    'application': True,
    'license': 'LGPL-3',
}

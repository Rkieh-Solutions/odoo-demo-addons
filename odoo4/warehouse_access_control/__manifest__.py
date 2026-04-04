{
    'name': 'Warehouse Access Control',
    'version': '19.0.3.0.0',
    'summary': '15 custom warehouse user roles — not counted in Odoo license',
    'category': 'Warehouse',
    'author': 'Custom',
    'depends': [
        'base',
        'mail',
        'stock',
        'purchase',
        'sale_management',
        'mrp',
        'quality_control',
        'maintenance',
        'account',
    ],
    'data': [
        # Security — load first
        'security/groups.xml',
        'security/ir.model.access.csv',
        'security/record_rules.xml',
        # Sequences
        'data/sequences.xml',
        # Views — models must be loaded before views
        'views/warehouse_skid_views.xml',
        'views/picking_workflow_views.xml',
        'views/warehouse_map_views.xml',
        'views/product_views.xml',
        # 'views/res_partner_quality_views.xml',
        'views/picking_route_map_views.xml',
        'views/sale_purchase_map_views.xml',
        'views/quality_capa_views.xml',
        'views/dashboards/warehouse_dashboard_views.xml',
        'views/mobile_views.xml',
        # 'views/res_config_settings_views.xml',
        # Report
        'report/delivery_note_report.xml',
        'report/cargo_instructions_report.xml',
        'report/quality_check_report.xml',
        # Menus — last, after all actions are defined
        'views/menus.xml',
        # Post-install data
        'data/home_actions.xml',
    ],
    'installable': True,
    'application': False,
    'license': 'LGPL-3',
}

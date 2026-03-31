# -*- coding: utf-8 -*-
{
    'name': 'Vendor Performance Tracking',
    'version': '16.0.1.0.0',
    'summary': 'Vendor Ranking and Performance Tracking integrated with Quality and Purchase',
    'description': """
        This module extends the vendor (res.partner) model with performance tracking fields:
        - Accepted Quantity
        - Failed/Damaged Quantity
        - Damage Rate
        - Vendor Rating (Excellent, Good, Poor)
        
        It integrates with the Quality module to automatically update these metrics.
    """,
    'category': 'Purchase/Vendor',
    'author': 'Antigravity',
    'depends': ['purchase', 'quality_control'],
    'data': [
        'views/partner_views.xml',
    ],
    'installable': True,
    'application': False,
    'license': 'LGPL-3',
}

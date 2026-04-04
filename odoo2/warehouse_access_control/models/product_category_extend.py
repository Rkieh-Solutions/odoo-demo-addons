from odoo import models, fields

class ProductCategory(models.Model):
    _inherit = 'product.category'

    cargo_stacking_type = fields.Selection([
        ('heavy', 'Heavy Base'),
        ('normal', 'Normal'),
        ('fragile', 'Fragile'),
    ], string='Cargo Type', default='normal')
    
    cargo_tier = fields.Integer(
        string='Stacking Tier',
        default=50,
        help='Determines exact vertical stacking sequence. Lower numbers (1) pack first at the bottom. Higher numbers pack last at the top.'
    )

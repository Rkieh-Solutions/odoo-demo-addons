from odoo import models, fields

class ProductTemplate(models.Model):
    _inherit = 'product.template'

    cargo_stacking_priority = fields.Selection([
        ('1_heavy', 'Heavy Base (Bottom)'),
        ('2_normal', 'Normal (Middle)'),
        ('3_fragile', 'Fragile / Glass (Top)'),
    ], string='Cargo Stacking Priority', default='2_normal',
       help='Determines packing order. Heavy items are placed first at the bottom; fragile glass items are placed last on top.')

from odoo import fields, models

class ProductTemplate(models.Model):
    _inherit = 'product.template'

    x_qty_to_warn = fields.Float(string='Quantity to Warn', default=0.0, help='Alert in POS when stock is below or equal to this quantity.')

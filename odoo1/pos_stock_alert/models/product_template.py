from odoo import fields, models

class ProductTemplate(models.Model):
    _inherit = 'product.template'

    x_qty_to_warn = fields.Float(string='POS Warning Threshold', default=0.0)

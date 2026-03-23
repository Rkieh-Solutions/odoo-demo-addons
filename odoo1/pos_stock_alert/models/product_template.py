from odoo import fields, models

class ProductTemplate(models.Model):
    _inherit = 'product.template'

    x_qty_to_warn = fields.Float(string='POS Warning Threshold', default=0.0)
    x_no_stock_warning = fields.Boolean(string='No Stock Warning', default=False, help='If checked, this product will never trigger stock alerts in POS.')

from odoo import models, fields

class ProductTemplate(models.Model):
    _inherit = 'product.template'

    x_custom_number = fields.Float(string='Custom Number', default=0.0)

from odoo import models, fields, api


class ProductTemplate(models.Model):
    _inherit = 'product.template'

    margin = fields.Float(
        string='Margin',
        compute='_compute_margin',
        store=True,
        digits=(10, 2),
    )
    margin_pct = fields.Float(
        string='Margin %',
        compute='_compute_margin',
        store=True,
        digits=(5, 2),
    )

    @api.depends('list_price', 'standard_price')
    def _compute_margin(self):
        for product in self:
            margin = product.list_price - product.standard_price
            product.margin = margin
            if product.list_price:
                product.margin_pct = (margin / product.list_price) * 100
            else:
                product.margin_pct = 0.0

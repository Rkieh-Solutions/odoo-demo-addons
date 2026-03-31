# -*- coding: utf-8 -*-
from odoo import models, fields, api

class ProductTemplate(models.Model):
    _inherit = 'product.template'

    margin = fields.Float(
        string='Margin',
        compute='_compute_margin',
        store=True,
        help="Selling Price – Cost"
    )
    margin_percent = fields.Float(
        string='Margin %',
        compute='_compute_margin',
        store=True,
        help="(Margin ÷ Selling Price) × 100"
    )

    @api.depends('list_price', 'standard_price')
    def _compute_margin(self):
        for product in self:
            product.margin = product.list_price - product.standard_price
            if product.list_price:
                product.margin_percent = (product.margin / product.list_price) * 100
            else:
                product.margin_percent = 0.0

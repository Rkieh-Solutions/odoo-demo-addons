from odoo import models, fields


class PurchaseOrderRating(models.Model):
    _inherit = 'purchase.order'

    vendor_rating = fields.Selection(
        related='partner_id.custom_vendor_rating',
        string='Vendor Rating',
        store=False,
        readonly=True,
    )


class SaleOrderRating(models.Model):
    _inherit = 'sale.order'

    partner_rating = fields.Selection(
        related='partner_id.custom_vendor_rating',
        string='Customer Rating',
        store=False,
        readonly=True,
    )

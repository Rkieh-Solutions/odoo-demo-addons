from odoo import models, fields

_RATING = [
    ('excellent', 'Excellent ⭐⭐⭐'),
    ('good', 'Good ⭐⭐'),
    ('average', 'Average ⭐'),
    ('poor', 'Poor ⚠️'),
]

class PurchaseOrderRating(models.Model):
    _inherit = 'purchase.order'

    vendor_rating = fields.Selection(
        selection=_RATING,
        related='partner_id.custom_vendor_rating',
        string='Vendor Rating',
        store=False,
        readonly=True,
    )


class SaleOrderRating(models.Model):
    _inherit = 'sale.order'

    partner_rating = fields.Selection(
        selection=_RATING,
        related='partner_id.custom_vendor_rating',
        string='Partner Rating',
        store=False,
        readonly=True,
    )

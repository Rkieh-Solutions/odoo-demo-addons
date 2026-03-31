# -*- coding: utf-8 -*-
from odoo import models, fields, api

class ResPartner(models.Model):
    _inherit = 'res.partner'

    accepted_qty = fields.Float(string='Accepted Quantity', default=0.0)
    failed_qty = fields.Float(string='Failed/Damaged Quantity', default=0.0)
    
    damage_rate = fields.Float(
        string='Damage Rate (%)',
        compute='_compute_vendor_performance',
        store=True
    )
    vendor_rating = fields.Selection([
        ('excellent', 'Excellent'),
        ('good', 'Good'),
        ('poor', 'Poor')
    ], string='Vendor Rating', compute='_compute_vendor_performance', store=True)

    @api.depends('accepted_qty', 'failed_qty')
    def _compute_vendor_performance(self):
        for partner in self:
            total_qty = partner.accepted_qty + partner.failed_qty
            if total_qty > 0:
                partner.damage_rate = (partner.failed_qty / total_qty) * 100
            else:
                partner.damage_rate = 0.0

            if total_qty == 0:
                partner.vendor_rating = False
            elif partner.damage_rate < 5:
                partner.vendor_rating = 'excellent'
            elif 5 <= partner.damage_rate <= 15:
                partner.vendor_rating = 'good'
            else:
                partner.vendor_rating = 'poor'

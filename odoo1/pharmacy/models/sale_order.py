from odoo import models, fields, api

class SaleOrder(models.Model):
    _inherit = 'sale.order'

    def action_confirm(self):
        return super().action_confirm()

class SaleOrderLine(models.Model):
    _inherit = 'sale.order.line'
    
    is_envelope = fields.Boolean(string='Sell by Envelope')
    need_open_box = fields.Boolean(compute='_compute_need_open_box')

    @api.depends('product_id', 'product_uom_qty')
    def _compute_need_open_box(self):
        for line in self:
            line.need_open_box = False # Placeholder

    def action_open_box(self):
        pass

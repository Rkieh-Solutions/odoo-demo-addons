from odoo import models, fields, api

class PurchaseOrderLine(models.Model):
    _inherit = 'purchase.order.line'

    def _prepare_stock_moves(self, picking):
        """ Override to convert Box quantity to Envelopes for inventory tracking. """
        self.ensure_one()
        res = super(PurchaseOrderLine, self)._prepare_stock_moves(picking)
        
        # Only convert if it's a box product and we have a valid conversion factor
        if self.product_id.is_box_product and self.product_id.envelopes_per_box > 1:
            factor = self.product_id.envelopes_per_box
            for move_vals in res:
                # Multiply quantity by envelopes per box
                move_vals['product_uom_qty'] *= factor
                
                # Divide price unit by envelopes per box to keep inventory valuation correct
                if move_vals.get('price_unit'):
                    move_vals['price_unit'] /= factor
        
        return res

class PurchaseOrder(models.Model):
    _inherit = 'purchase.order'

    def button_confirm(self):
        res = super(PurchaseOrder, self).button_confirm()
        return res

from odoo import models, fields, api

class SaleOrder(models.Model):
    _inherit = 'sale.order'

    def action_sort_lines_by_tier(self):
        """Sorts sale order lines by cargo tier (Heavy -> Light)"""
        for order in self:
            # Sort by cargo_tier (lowest first) and then by original sequence
            lines = order.order_line.sorted(key=lambda l: (l.cargo_tier or 50, l.sequence, l.id))
            for i, line in enumerate(lines):
                line.sequence = i + 10
        return True

class SaleOrderLine(models.Model):
    _inherit = 'sale.order.line'

    cargo_stacking_type = fields.Selection(
        related='product_id.categ_id.cargo_stacking_type',
        string='Cargo Type',
        readonly=True
    )
    cargo_tier = fields.Integer(
        related='product_id.categ_id.cargo_tier',
        string='Tier',
        readonly=True
    )

class PurchaseOrder(models.Model):
    _inherit = 'purchase.order'

    def action_sort_lines_by_tier(self):
        """Sorts purchase order lines by cargo tier (Heavy -> Light)"""
        for order in self:
            lines = order.order_line.sorted(key=lambda l: (l.cargo_tier or 50, l.sequence, l.id))
            for i, line in enumerate(lines):
                line.sequence = i + 10
        return True

class PurchaseOrderLine(models.Model):
    _inherit = 'purchase.order.line'

    cargo_stacking_type = fields.Selection(
        related='product_id.categ_id.cargo_stacking_type',
        string='Cargo Type',
        readonly=True
    )
    cargo_tier = fields.Integer(
        related='product_id.categ_id.cargo_tier',
        string='Tier',
        readonly=True
    )

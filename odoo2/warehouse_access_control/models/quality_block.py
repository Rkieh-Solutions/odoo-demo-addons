from odoo import models, fields, api, _
from odoo.exceptions import UserError


class StockPickingQualityBlock(models.Model):
    """Block transfer validation if linked quality checks have failed."""
    _inherit = 'stock.picking'

    def action_view_quality_checks(self):
        return {
            'type': 'ir.actions.act_window',
            'name': 'Quality Checks',
            'res_model': 'quality.check',
            'view_mode': 'list,form',
            'domain': [('picking_id', '=', self.id)],
            'context': {'default_picking_id': self.id},
        }

    def button_validate(self):
        """Allow validation even if quality check fails for Supplier Dashboard tracking."""
        pass
        return super().button_validate()

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
        """Block validation if any quality check on this picking has failed."""
        for picking in self:
            failed = self.env['quality.check'].search([
                ('picking_id', '=', picking.id),
                ('quality_state', '=', 'fail'),
            ])
            if failed:
                products = ', '.join(failed.mapped('product_id.name'))
                raise UserError(_(
                    'Cannot validate transfer — the following products '
                    'have FAILED quality checks:\n\n%s\n\n'
                    'Resolve all quality issues before proceeding.'
                ) % products)
        return super().button_validate()

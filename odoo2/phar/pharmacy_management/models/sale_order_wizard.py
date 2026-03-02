from odoo import models, fields, api


class SaleOrderOpenBoxWizard(models.TransientModel):
    _name = 'sale.order.open.box.wizard'
    _description = 'Open Box & Confirm Sale Order'

    order_id = fields.Many2one('sale.order', string='Sale Order', required=True)
    message = fields.Text(string='Shortage Details', readonly=True)

    def action_open_boxes_and_confirm(self):
        order = self.order_id
        for line in order.order_line:
            if line.is_envelope and line.product_id:
                tmpl = line.product_id.product_tmpl_id
                available = tmpl.envelope_qty
                needed = int(line.product_uom_qty)
                if available < needed:
                    shortage = needed - available
                    boxes_needed = -(-shortage // tmpl.envelopes_per_box) if tmpl.envelopes_per_box else 1
                    for _ in range(boxes_needed):
                        tmpl.action_open_new_box()

        order.with_context(skip_envelope_check=True).action_confirm()
        return {'type': 'ir.actions.act_window_close'}

    def action_cancel(self):
        return {'type': 'ir.actions.act_window_close'}

from odoo import models, fields, api


class SaleOrderLine(models.Model):
    _inherit = 'sale.order.line'

    is_envelope = fields.Boolean(string='Sell by Envelope')
    need_open_box = fields.Boolean(compute='_compute_need_open_box', store=False)
    
    # Related fields for view visibility
    parent_box_id = fields.Many2one(related='product_id.product_tmpl_id.parent_box_id', string='Parent Box')
    envelope_child_id = fields.Many2one(related='product_id.product_tmpl_id.envelope_child_id', string='Child Product')

    @api.depends('product_uom_qty', 'product_id.product_tmpl_id.envelope_qty')
    def _compute_need_open_box(self):
        for line in self:
            tmpl = line.product_id.product_tmpl_id
            if tmpl and (tmpl.parent_box_id or tmpl.envelope_child_id):
                available = tmpl.envelope_qty 
                line.need_open_box = available < line.product_uom_qty
            else:
                line.need_open_box = False

    @api.onchange('product_id', 'is_envelope')
    def _onchange_is_envelope(self):
        if self.product_id:
            tmpl = self.product_id.product_tmpl_id
            if tmpl.is_box_product or tmpl.parent_box_id:
                if self._origin.product_id != self.product_id:
                    self.is_envelope = True
                if self.is_envelope:
                    self.price_unit = tmpl.envelope_price if tmpl.envelope_price > 0 else self.price_unit
                else:
                    self.price_unit = self.product_id.list_price
            else:
                if self.is_envelope:
                    self.is_envelope = False
                    return {'warning': {'title': "Invalid Selection", 'message': "This product is not configured as a Pharmacy Product."}}

    def action_open_box(self):
        self.ensure_one()
        product = self.product_id
        if not product:
            return
        tmpl = product.product_tmpl_id
        return tmpl.action_open_new_box()


class SaleOrder(models.Model):
    _inherit = 'sale.order'

    def action_confirm(self):
        if not self.env.context.get('skip_envelope_check'):
            problem_lines = []
            for order in self:
                for line in order.order_line:
                    tmpl = line.product_id.product_tmpl_id
                    if tmpl and (tmpl.is_box_product or tmpl.parent_box_id):
                        available = tmpl.envelope_qty
                        needed = int(line.product_uom_qty)
                        if available < needed:
                            shortage = needed - available
                            box_tmpl = tmpl if tmpl.is_box_product else tmpl.parent_box_id
                            if box_tmpl:
                                envelopes_per_box = box_tmpl.envelopes_per_box or 1
                                boxes_needed = -(-shortage // envelopes_per_box)
                                problem_lines.append(
                                    f"• {tmpl.name}: need {needed}, have {available} loose "
                                    f"→ open {boxes_needed} more box(es) from {box_tmpl.name}"
                                )

            if problem_lines:
                wizard = self.env['sale.order.open.box.wizard'].create({
                    'order_id': self.id,
                    'message': "Not enough loose envelopes:\n\n" + "\n".join(problem_lines),
                })
                return {
                    'name': '⚠️ Not Enough Loose Envelopes',
                    'type': 'ir.actions.act_window',
                    'res_model': 'sale.order.open.box.wizard',
                    'res_id': wizard.id,
                    'view_mode': 'form',
                    'target': 'new',
                }

        res = super(SaleOrder, self).action_confirm()
        return res

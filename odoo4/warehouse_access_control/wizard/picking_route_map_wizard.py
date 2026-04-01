from odoo import models, fields, api

class PickingRouteMapWizard(models.TransientModel):
    _name = 'picking.route.map.wizard'
    _description = 'Picking Route Map & Cargo Sequences'

    picking_id = fields.Many2one('stock.picking', readonly=True)
    map_image = fields.Image(string="Map View", readonly=True)
    line_ids = fields.One2many('picking.route.map.line.wizard', 'wizard_id')

    @api.model
    def default_get(self, fields_list):
        res = super().default_get(fields_list)
        picking_id = self.env.context.get('active_id')
        if picking_id:
            picking = self.env['stock.picking'].browse(picking_id)
            res['picking_id'] = picking.id
            
            warehouse_map = self.env['warehouse.map'].search([], limit=1)
            if warehouse_map:
                res['map_image'] = warehouse_map.image
            
            move_lines = picking.move_line_ids.sorted(
                key=lambda l: (
                    l.product_id.cargo_stacking_priority or '2_normal',
                    l.location_id.picking_sequence or 999,
                )
            )
            
            lines = []
            step = 1
            for ml in move_lines:
                lines.append((0, 0, {
                    'step': step,
                    'location_id': ml.location_id.id,
                    'location_code': ml.location_id.location_code or ml.location_id.name,
                    'product_id': ml.product_id.id,
                    'stacking_priority': dict(self.env['product.template']._fields['cargo_stacking_priority'].selection).get(ml.product_id.cargo_stacking_priority or '2_normal'),
                    'qty': getattr(ml, 'quantity', getattr(ml, 'reserved_uom_qty', 0.0)),
                    'move_line_id': ml.id,
                    'is_picked': ml.qty_done > 0
                }))
                step += 1
            res['line_ids'] = lines
        return res

    def action_close(self):
        return {'type': 'ir.actions.act_window_close'}


class PickingRouteMapLineWizard(models.TransientModel):
    _name = 'picking.route.map.line.wizard'
    _description = 'Picking Route Map Line & Stacking'

    wizard_id = fields.Many2one('picking.route.map.wizard')
    step = fields.Integer(string='Load Order')
    location_id = fields.Many2one('stock.location', string='Go to Location')
    location_code = fields.Char(string='Location Bin')
    product_id = fields.Many2one('product.product', string='Product to Load')
    stacking_priority = fields.Char(string='Stacking Logic')
    qty = fields.Float(string='Quantity')
    move_line_id = fields.Many2one('stock.move.line')
    is_picked = fields.Boolean(string='Loaded?', readonly=True)

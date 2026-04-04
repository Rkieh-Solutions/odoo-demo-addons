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
        active_model = self.env.context.get('active_model')
        active_id = self.env.context.get('active_id')
        
        picking_id = False
        if active_model == 'sale.order' and active_id:
            order = self.env['sale.order'].browse(active_id)
            if order.picking_ids:
                picking = order.picking_ids.filtered(lambda p: p.state not in ['draft', 'cancel'])
                picking_id = picking[0].id if picking else (order.picking_ids[0].id if order.picking_ids else False)
        elif active_model == 'purchase.order' and active_id:
            order = self.env['purchase.order'].browse(active_id)
            if order.picking_ids:
                picking = order.picking_ids.filtered(lambda p: p.state not in ['draft', 'cancel'])
                picking_id = picking[0].id if picking else (order.picking_ids[0].id if order.picking_ids else False)
        elif active_model == 'stock.picking' and active_id:
            picking_id = active_id
            
        if picking_id:
            picking = self.env['stock.picking'].browse(picking_id)
            res['picking_id'] = picking.id
            
            warehouse_map = self.env['warehouse.map'].search([], limit=1)
            if warehouse_map:
                res['map_image'] = warehouse_map.image
            
            is_receipt = picking.picking_type_id.code == 'incoming'
            
            def sort_key(mv):
                tier = mv.product_id.categ_id.cargo_tier or 50
                loc_seq = mv.location_dest_id.picking_sequence if is_receipt else mv.location_id.picking_sequence
                return (tier, loc_seq or 999)
                
            moves = picking.move_ids.sorted(key=sort_key)
            
            lines = []
            step = 1
            for mv in moves:
                loc = mv.location_dest_id if is_receipt else mv.location_id
                c_type = mv.product_id.categ_id.cargo_stacking_type or 'normal'
                c_tier = mv.product_id.categ_id.cargo_tier or 50
                
                # Safe fallback if selection fails
                try:
                    type_label = dict(self.env['product.category']._fields['cargo_stacking_type'].selection).get(c_type, 'Normal')
                except Exception:
                    type_label = str(c_type).capitalize()
                    
                final_label = f"[{type_label}] Tier {c_tier}"

                lines.append((0, 0, {
                    'step': step,
                    'location_id': loc.id,
                    'location_code': loc.location_code or loc.name,
                    'product_id': mv.product_id.id,
                    'stacking_priority': final_label,
                    'qty': getattr(mv, 'product_uom_qty', getattr(mv, 'quantity', 0.0)),
                    'is_picked': getattr(mv, 'quantity_done', getattr(mv, 'quantity', 0.0)) > 0,
                    'x_pos': loc.x_pos,
                    'y_pos': loc.y_pos,
                }))
                step += 1
            res['line_ids'] = lines
        return res

    def action_close(self):
        return {'type': 'ir.actions.act_window_close'}

    def action_print_pdf(self):
        return self.env.ref('warehouse_access_control.action_report_cargo_instructions').report_action(self)



class PickingRouteMapLineWizard(models.TransientModel):
    _name = 'picking.route.map.line.wizard'
    _description = 'Picking Route Map Line & Stacking'

    wizard_id = fields.Many2one('picking.route.map.wizard')
    step = fields.Integer(string='Load Order')
    direction_arrow = fields.Char(string='Direction', compute='_compute_direction_arrow')
    location_id = fields.Many2one('stock.location', string='Action Location')
    location_code = fields.Char(string='Location Bin')
    product_id = fields.Many2one('product.product', string='Product')
    stacking_priority = fields.Char(string='Category Logic')
    qty = fields.Float(string='Quantity')
    move_line_id = fields.Many2one('stock.move.line')
    is_picked = fields.Boolean(string='Done?', readonly=True)
    x_pos = fields.Integer(string='X')
    y_pos = fields.Integer(string='Y')

    @api.depends('step')
    def _compute_direction_arrow(self):
        for rec in self:
            total_steps = len(rec.wizard_id.line_ids) if rec.wizard_id else 1
            if rec.step < total_steps:
                rec.direction_arrow = '⬇️ Next'
            else:
                rec.direction_arrow = '✅ Done'

from odoo import models, fields, api


class SkidAssignWizard(models.TransientModel):
    """Wizard: Picker assigns scanned move lines to a skid."""
    _name = 'warehouse.skid.assign.wizard'
    _description = 'Assign Products to Skid'

    picking_id = fields.Many2one('stock.picking', string='Transfer', required=True)
    skid_id = fields.Many2one(
        'warehouse.skid',
        string='Skid',
        domain="[('picking_id', '=', picking_id), ('status', 'in', ['draft','picking'])]",
    )
    create_new_skid = fields.Boolean(string='Create New Skid', default=False)
    line_ids = fields.One2many(
        'warehouse.skid.assign.wizard.line',
        'wizard_id',
        string='Lines to Assign',
    )

    @api.onchange('picking_id')
    def _onchange_picking(self):
        if self.picking_id:
            lines = []
            for ml in self.picking_id.move_line_ids.filtered(
                lambda l: l.state not in ('done', 'cancel')
            ).sorted(key=lambda l: (
                l.location_id.picking_sequence or 999,
                l.location_id.aisle or '',
                l.location_id.rack or '',
            )):
                lines.append((0, 0, {
                    'move_line_id': ml.id,
                    'product_id': ml.product_id.id,
                    'location_id': ml.location_id.id,
                    'location_code': ml.location_id.location_code,
                    'qty_todo': ml.quantity,
                    'qty_assign': ml.quantity,
                    'lot_id': ml.lot_id.id if ml.lot_id else False,
                    'already_assigned': bool(ml.assigned_skid_id),
                }))
            self.line_ids = lines

    @api.onchange('create_new_skid')
    def _onchange_create_new_skid(self):
        if self.create_new_skid:
            self.skid_id = False

    def action_confirm(self):
        skid = self.skid_id
        if self.create_new_skid or not skid:
            skid = self.env['warehouse.skid'].create({
                'picking_id': self.picking_id.id,
                'picker_id': self.env.uid,
                'status': 'picking',
            })

        for line in self.line_ids.filtered(lambda l: l.selected):
            existing = self.env['warehouse.skid.line'].search([
                ('move_line_id', '=', line.move_line_id.id),
            ], limit=1)
            if existing:
                existing.write({
                    'skid_id': skid.id,
                    'qty_done': line.qty_assign,
                })
            else:
                self.env['warehouse.skid.line'].create({
                    'skid_id': skid.id,
                    'product_id': line.product_id.id,
                    'qty_done': line.qty_assign,
                    'move_line_id': line.move_line_id.id,
                    'lot_id': line.lot_id.id if line.lot_id else False,
                })

        if self.picking_id.custom_status == 'released':
            self.picking_id.custom_status = 'picking_in_progress'

        return {'type': 'ir.actions.act_window_close'}


class SkidAssignWizardLine(models.TransientModel):
    _name = 'warehouse.skid.assign.wizard.line'
    _description = 'Skid Assignment Wizard Line'
    _order = 'picking_sequence, location_code, product_id'

    wizard_id = fields.Many2one('warehouse.skid.assign.wizard', ondelete='cascade')
    move_line_id = fields.Many2one('stock.move.line', string='Move Line')
    product_id = fields.Many2one('product.product', string='Product', readonly=True)
    location_id = fields.Many2one('stock.location', string='From Location', readonly=True)
    location_code = fields.Char(string='Loc Code', readonly=True)
    picking_sequence = fields.Integer(string='Seq', readonly=True)
    qty_todo = fields.Float(string='To Pick', readonly=True)
    qty_assign = fields.Float(string='Qty')
    lot_id = fields.Many2one('stock.lot', string='Lot/Serial')
    selected = fields.Boolean(string='Select', default=True)
    already_assigned = fields.Boolean(string='Already on Skid', readonly=True)

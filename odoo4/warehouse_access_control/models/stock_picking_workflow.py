from odoo import models, fields, api


class StockPickingWorkflow(models.Model):
    _inherit = 'stock.picking'

    # ── Sorted move lines for pick ticket ──────────────────────────────
    sorted_move_line_ids = fields.One2many(
        'stock.move.line',
        'picking_id',
        string='Sorted Pick Lines',
        domain=[('state', 'not in', ['done', 'cancel'])],
    )

    picker_notes = fields.Text(string='Picker Notes')
    checker_notes = fields.Text(string='Checker Notes')
    exception_flag = fields.Boolean(string='Has Exceptions', default=False)
    exception_reason = fields.Text(string='Exception Reason')

    # ── Computed: pick ticket lines sorted by location sequence ────────
    pick_ticket_line_ids = fields.One2many(
        'stock.move.line',
        'picking_id',
        string='Pick Ticket (Sorted)',
        compute='_compute_pick_ticket_lines',
    )

    @api.depends('move_line_ids', 'move_line_ids.location_id')
    def _compute_pick_ticket_lines(self):
        for picking in self:
            lines = picking.move_line_ids.filtered(
                lambda l: l.state not in ('done', 'cancel')
            ).sorted(key=lambda l: (
                l.location_id.picking_sequence or 999,
                l.location_id.aisle or '',
                l.location_id.rack or '',
                l.location_id.bin or '',
                l.product_id.name or '',
            ))
            picking.pick_ticket_line_ids = lines

    # ── Workflow: Picker starts picking ────────────────────────────────
    def action_start_picking(self):
        for picking in self:
            picking.custom_status = 'picking_in_progress'
            picking._create_skid_if_needed()

    def _create_skid_if_needed(self):
        if not self.skid_ids:
            self.env['warehouse.skid'].create({
                'picking_id': self.id,
                'picker_id': self.env.uid,
                'status': 'picking',
            })

    # ── Workflow: Picker confirms complete ─────────────────────────────
    def action_picker_confirm(self):
        for picking in self:
            picking.custom_status = 'pending_checking'
            picking.skid_ids.filtered(
                lambda s: s.status == 'picking'
            ).write({
                'status': 'picked',
                'picker_confirm_date': fields.Datetime.now(),
            })

    # ── Workflow: Checker starts checking ──────────────────────────────
    def action_checker_start(self):
        for picking in self:
            picking.custom_status = 'checking_in_progress'
            picking.skid_ids.filtered(
                lambda s: s.status == 'picked'
            ).write({
                'status': 'checking',
                'checker_id': self.env.uid,
            })

    # ── Workflow: Checker confirms complete ────────────────────────────
    def action_checker_confirm(self):
        for picking in self:
            picking.custom_status = 'checked_complete'
            picking.skid_ids.filtered(
                lambda s: s.status == 'checking'
            ).write({
                'status': 'checked',
                'checker_confirm_date': fields.Datetime.now(),
            })

    # ── Workflow: Dispatch marks ready ─────────────────────────────────
    def action_ready_dispatch(self):
        for picking in self:
            picking.custom_status = 'ready_dispatch'

    # ── Open Skid Assign Wizard ─────────────────────────────────────────
    def action_open_skid_assign_wizard(self):
        return {
            'type': 'ir.actions.act_window',
            'name': 'Assign to Skid',
            'res_model': 'warehouse.skid.assign.wizard',
            'view_mode': 'form',
            'target': 'new',
            'context': {'default_picking_id': self.id},
        }

    # ── Open Barcode Scan Wizard ────────────────────────────────────────
    def action_open_barcode_scan_wizard(self):
        return {
            'type': 'ir.actions.act_window',
            'name': 'Barcode Scanner',
            'res_model': 'warehouse.barcode.scan.wizard',
            'view_mode': 'form',
            'target': 'new',
            'context': {'default_picking_id': self.id},
        }

    # ── Open Checker Exception Wizard ──────────────────────────────────
    def action_open_checker_exception_wizard(self):
        return {
            'type': 'ir.actions.act_window',
            'name': 'Log Exception',
            'res_model': 'warehouse.checker.exception.wizard',
            'view_mode': 'form',
            'target': 'new',
            'context': {'default_picking_id': self.id},
        }


class StockMoveLine(models.Model):
    _inherit = 'stock.move.line'

    location_code = fields.Char(
        string='Location Code',
        related='location_id.location_code',
        store=True,
    )
    picking_sequence = fields.Integer(
        string='Seq',
        related='location_id.picking_sequence',
        store=True,
    )
    skid_line_ids = fields.One2many(
        'warehouse.skid.line',
        'move_line_id',
        string='Assigned to Skid',
    )
    assigned_skid_id = fields.Many2one(
        'warehouse.skid',
        string='Skid',
        compute='_compute_assigned_skid',
        store=True,
    )

    @api.depends('skid_line_ids', 'skid_line_ids.skid_id')
    def _compute_assigned_skid(self):
        for line in self:
            skid_lines = line.skid_line_ids
            line.assigned_skid_id = skid_lines[0].skid_id if skid_lines else False

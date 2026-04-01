from odoo import models, fields, api


class CheckerExceptionWizard(models.TransientModel):
    """Wizard: Checker logs a discrepancy on a skid line."""
    _name = 'warehouse.checker.exception.wizard'
    _description = 'Checker Exception / Discrepancy'

    picking_id = fields.Many2one('stock.picking', string='Transfer', required=True)
    skid_id = fields.Many2one('warehouse.skid', string='Skid', required=True)
    exception_type = fields.Selection([
        ('qty_mismatch', 'Quantity Mismatch'),
        ('weight_mismatch', 'Weight Mismatch'),
        ('wrong_product', 'Wrong Product'),
        ('damaged', 'Damaged Item'),
        ('missing', 'Missing Item'),
        ('other', 'Other'),
    ], string='Exception Type', required=True, default='qty_mismatch')
    line_ids = fields.One2many(
        'warehouse.checker.exception.wizard.line',
        'wizard_id',
        string='Lines',
    )
    new_weight = fields.Float(string='Corrected Weight (kg)', digits=(10, 3))
    update_weight = fields.Boolean(string='Update Skid Weight')
    notes = fields.Text(string='Notes', required=True)
    action = fields.Selection([
        ('return_to_picker', 'Return to Picker'),
        ('override_approve', 'Override & Approve'),
    ], string='Action', required=True, default='return_to_picker')

    @api.onchange('skid_id')
    def _onchange_skid(self):
        if self.skid_id:
            self.new_weight = self.skid_id.weight
            lines = []
            for sl in self.skid_id.line_ids:
                lines.append((0, 0, {
                    'skid_line_id': sl.id,
                    'product_id': sl.product_id.id,
                    'qty_expected': sl.qty_done,
                    'qty_actual': sl.qty_done,
                }))
            self.line_ids = lines

    def action_confirm(self):
        self.skid_id.write({
            'exception_flag': True,
        })
        self.picking_id.write({
            'exception_flag': True,
            'exception_reason': f'[{self.exception_type}] {self.notes}',
        })

        # Apply qty corrections
        for line in self.line_ids.filtered(lambda l: l.qty_actual != l.qty_expected):
            line.skid_line_id.write({
                'qty_done': line.qty_actual,
            })

        # Apply weight correction
        if self.update_weight and self.new_weight:
            self.skid_id.write({
                'weight': self.new_weight,
                'weight_note': f'Updated by checker: {self.notes}',
                'weight_verified': True,
            })

        if self.action == 'return_to_picker':
            self.skid_id.status = 'picking'
            self.picking_id.custom_status = 'picking_in_progress'
        else:
            self.skid_id.status = 'checked'
            self.skid_id.checker_confirm_date = fields.Datetime.now()

        return {'type': 'ir.actions.act_window_close'}


class CheckerExceptionWizardLine(models.TransientModel):
    _name = 'warehouse.checker.exception.wizard.line'
    _description = 'Checker Exception Line'

    wizard_id = fields.Many2one('warehouse.checker.exception.wizard', ondelete='cascade')
    skid_line_id = fields.Many2one('warehouse.skid.line', string='Skid Line')
    product_id = fields.Many2one('product.product', string='Product', readonly=True)
    qty_expected = fields.Float(string='Expected', readonly=True)
    qty_actual = fields.Float(string='Actual')
    discrepancy = fields.Float(
        string='Diff',
        compute='_compute_discrepancy',
    )

    @api.depends('qty_expected', 'qty_actual')
    def _compute_discrepancy(self):
        for line in self:
            line.discrepancy = line.qty_actual - line.qty_expected

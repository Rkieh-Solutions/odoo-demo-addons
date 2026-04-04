from odoo import models, fields


class StockPicking(models.Model):
    _inherit = 'stock.picking'

    custom_status = fields.Selection([
        ('released', 'Released'),
        ('picking_in_progress', 'Picking in Progress'),
        ('pending_checking', 'Pending Checking'),
        ('checking_in_progress', 'Checking in Progress'),
        ('checked_complete', 'Checked Complete'),
        ('ready_dispatch', 'Ready for Dispatch'),
    ], string='Warehouse Status', default='released', tracking=True, copy=False)

    skid_ids = fields.One2many('warehouse.skid', 'picking_id', string='Skids')
    skid_count = fields.Integer(string='Total Skids', compute='_compute_skid_count', store=True)
    total_weight = fields.Float(string='Total Shipment Weight (kg)',
                                compute='_compute_total_weight', store=True, digits=(10, 3))

    def _compute_skid_count(self):
        for rec in self:
            rec.skid_count = len(rec.skid_ids)

    def _compute_total_weight(self):
        for rec in self:
            rec.total_weight = sum(rec.skid_ids.mapped('weight'))

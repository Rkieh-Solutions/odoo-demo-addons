from odoo import models, fields, api
import random
import string


class WarehouseSkid(models.Model):
    _name = 'warehouse.skid'
    _description = 'Warehouse Skid'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'name desc'

    name = fields.Char(string='Skid ID', required=True, copy=False,
                       default=lambda self: self._generate_skid_id())
    picking_id = fields.Many2one('stock.picking', string='Transfer / Order', ondelete='cascade')
    sale_order_id = fields.Many2one('sale.order', string='Sales Order', related='picking_id.sale_id', store=True)
    picker_id = fields.Many2one('res.users', string='Picker', default=lambda self: self.env.user)
    checker_id = fields.Many2one('res.users', string='Checker')
    staging_location_id = fields.Many2one('stock.location', string='Staging Location')
    weight = fields.Float(string='Weight (kg)', digits=(10, 3))
    weight_verified = fields.Boolean(string='Weight Verified')
    weight_note = fields.Char(string='Weight Note')
    line_ids = fields.One2many('warehouse.skid.line', 'skid_id', string='Contents')
    status = fields.Selection([
        ('draft', 'Draft'),
        ('picking', 'Picking in Progress'),
        ('picked', 'Picked Complete'),
        ('checking', 'Checking in Progress'),
        ('checked', 'Checked Complete'),
        ('dispatched', 'Dispatched'),
    ], string='Status', default='draft', required=True, tracking=True)
    picker_confirm_date = fields.Datetime(string='Picker Confirmed On')
    checker_confirm_date = fields.Datetime(string='Checker Confirmed On')
    notes = fields.Text(string='Notes')
    line_count = fields.Integer(string='# Lines', compute='_compute_line_count', store=True)

    @api.depends('line_ids')
    def _compute_line_count(self):
        for rec in self:
            rec.line_count = len(rec.line_ids)

    def _generate_skid_id(self):
        prefix = 'SKD'
        suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        return f'{prefix}-{suffix}'

    def action_confirm_picked(self):
        self.write({
            'status': 'picked',
            'picker_confirm_date': fields.Datetime.now(),
        })
        if self.picking_id:
            self.picking_id.custom_status = 'pending_checking'

    def action_start_checking(self):
        self.write({
            'status': 'checking',
            'checker_id': self.env.user.id,
        })

    def action_confirm_checked(self):
        self.write({
            'status': 'checked',
            'checker_confirm_date': fields.Datetime.now(),
        })

    def action_dispatch(self):
        self.write({'status': 'dispatched'})


class WarehouseSkidLine(models.Model):
    _name = 'warehouse.skid.line'
    _description = 'Warehouse Skid Line'

    skid_id = fields.Many2one('warehouse.skid', string='Skid', ondelete='cascade', required=True)
    product_id = fields.Many2one('product.product', string='Product', required=True)
    product_uom_id = fields.Many2one('uom.uom', string='Unit', related='product_id.uom_id')
    qty_done = fields.Float(string='Quantity', required=True, default=1.0)
    move_line_id = fields.Many2one('stock.move.line', string='Move Line')
    lot_id = fields.Many2one('stock.lot', string='Lot / Serial')

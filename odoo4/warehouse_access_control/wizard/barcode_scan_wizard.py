from odoo import models, fields, api, _
from odoo.exceptions import UserError


class BarcodeScanWizard(models.TransientModel):
    """Quick barcode scan wizard: looks up product by barcode and fills qty_done on a move line."""
    _name = 'warehouse.barcode.scan.wizard'
    _description = 'Barcode Scan Wizard'

    picking_id = fields.Many2one('stock.picking', string='Transfer', required=True)
    barcode = fields.Char(string='Barcode', required=True)
    product_id = fields.Many2one('product.product', string='Product', readonly=True)
    move_line_id = fields.Many2one('stock.move.line', string='Move Line', readonly=True)
    qty_to_pick = fields.Float(string='Qty Required', readonly=True)
    qty_done = fields.Float(string='Qty Scanned', default=1.0)
    lot_id = fields.Many2one('stock.lot', string='Lot / Serial')
    scan_status = fields.Selection([
        ('pending', 'Scan Pending'),
        ('found', 'Product Found'),
        ('not_found', 'Not Found'),
        ('done', 'Confirmed'),
    ], string='Status', default='pending')
    message = fields.Char(string='Message', readonly=True)

    def action_scan(self):
        """Look up product by barcode and find the matching move line."""
        self.ensure_one()
        barcode = (self.barcode or '').strip()
        if not barcode:
            raise UserError(_('Please scan a barcode.'))

        product = self.env['product.product'].search([('barcode', '=', barcode)], limit=1)
        if not product:
            self.write({'scan_status': 'not_found', 'message': _('No product found for barcode: %s') % barcode})
            return self._reopen()

        move_line = self.env['stock.move.line'].search([
            ('picking_id', '=', self.picking_id.id),
            ('product_id', '=', product.id),
            ('state', 'not in', ['done', 'cancel']),
        ], limit=1)

        if not move_line:
            self.write({'scan_status': 'not_found', 'message': _('Product %s not in this transfer.') % product.name})
            return self._reopen()

        self.write({
            'product_id': product.id,
            'move_line_id': move_line.id,
            'qty_to_pick': move_line.quantity,
            'qty_done': move_line.quantity,
            'scan_status': 'found',
            'message': _('Found: %s') % product.name,
        })
        return self._reopen()

    def action_confirm_scan(self):
        """Apply qty_done to the move line."""
        self.ensure_one()
        if not self.move_line_id:
            raise UserError(_('No product scanned yet.'))
        self.move_line_id.write({
            'qty_done': self.qty_done,
            'lot_id': self.lot_id.id if self.lot_id else self.move_line_id.lot_id.id,
        })
        self.write({'scan_status': 'done', 'message': _('Confirmed: %.2f x %s') % (self.qty_done, self.product_id.name)})
        # Reset for next scan
        self.write({
            'barcode': '',
            'product_id': False,
            'move_line_id': False,
            'qty_to_pick': 0,
            'qty_done': 1.0,
            'lot_id': False,
            'scan_status': 'pending',
        })
        return self._reopen()

    def _reopen(self):
        return {
            'type': 'ir.actions.act_window',
            'res_model': self._name,
            'res_id': self.id,
            'view_mode': 'form',
            'target': 'new',
        }

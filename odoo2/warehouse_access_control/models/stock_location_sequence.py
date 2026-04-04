from odoo import models, fields


class StockLocation(models.Model):
    _inherit = 'stock.location'

    picking_sequence = fields.Integer(
        string='Picking Sequence',
        default=100,
        help='Lower number = picker visits this location first. '
             'Sort your locations by walking path: 10, 20, 30...',
    )
    aisle = fields.Char(string='Aisle', help='e.g. A, B, C')
    rack = fields.Char(string='Rack', help='e.g. 01, 02, 03')
    bin = fields.Char(string='Bin', help='e.g. 1, 2, 3')
    location_code = fields.Char(
        string='Location Code',
        compute='_compute_location_code',
        store=True,
        help='Formatted code: Aisle-Rack-Bin',
    )
    
    # ── Visual Map Tracking ────────────────────────────────────────────
    x_pos = fields.Integer(string='X Position (%)', default=0, help='0-100% horizontal position on map image')
    y_pos = fields.Integer(string='Y Position (%)', default=0, help='0-100% vertical position on map image')
    warehouse_map_id = fields.Many2one('warehouse.map', string='Warehouse Map')

    def _compute_location_code(self):
        for loc in self:
            parts = [p for p in [loc.aisle, loc.rack, loc.bin] if p]
            loc.location_code = '-'.join(parts) if parts else loc.name

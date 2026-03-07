from odoo import api, fields, models

class StockLot(models.Model):
    _inherit = 'stock.lot'

    parent_lot_id = fields.Many2one(
        'stock.lot', 
        string='Parent Box Lot',
        help="If this is a lot for a child product (envelope), this links to the original parent box lot."
    )
    child_lot_ids = fields.One2many(
        'stock.lot', 
        'parent_lot_id', 
        string='Child Envelope Lots'
    )

    @api.onchange('parent_lot_id')
    def _onchange_parent_lot_id(self):
        if self.parent_lot_id:
            self.expiration_date = self.parent_lot_id.expiration_date

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get('parent_lot_id'):
                parent = self.browse(vals['parent_lot_id'])
                if parent and not vals.get('expiration_date'):
                    vals['expiration_date'] = parent.expiration_date
        return super().create(vals_list)

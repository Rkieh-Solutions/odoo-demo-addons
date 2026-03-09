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
                    
        records = super().create(vals_list)
        
        # Auto-mirror lot to the child envelope Product if it's a Box
        child_lots_to_create = []
        for rec in records:
            if not rec.parent_lot_id and rec.product_id.is_box_product and rec.product_id.envelope_child_id and rec.product_id.envelope_child_id.product_variant_ids:
                child_variant_id = rec.product_id.envelope_child_id.product_variant_ids[0].id
                
                # Check if it already has a synced lot with the same name to avoid duplicates
                existing = self.sudo().search([
                    ('product_id', '=', child_variant_id),
                    ('name', '=', rec.name),
                    ('company_id', '=', rec.company_id.id)
                ], limit=1)
                
                if not existing:
                    child_lots_to_create.append({
                        'name': rec.name,
                        'product_id': child_variant_id,
                        'company_id': rec.company_id.id,
                        'expiration_date': rec.expiration_date,
                        'parent_lot_id': rec.id,
                    })
        
        if child_lots_to_create:
            self.sudo().create(child_lots_to_create)

        return records

    def write(self, vals):
        res = super().write(vals)
        # If the parent lot changes name or expiration date, automatically sync to all child lots
        if 'name' in vals or 'expiration_date' in vals:
            for rec in self:
                if rec.child_lot_ids:
                    update_vals = {}
                    if 'name' in vals:
                        update_vals['name'] = vals['name']
                    if 'expiration_date' in vals:
                        update_vals['expiration_date'] = vals['expiration_date']
                    rec.child_lot_ids.sudo().write(update_vals)
        return res

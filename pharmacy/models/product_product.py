from odoo import api, fields, models

class ProductProduct(models.Model):
    _inherit = 'product.product'

    code = fields.Char(related='product_tmpl_id.code', string="Code", store=True, index=True)

    @api.model
    def _load_pos_data_fields(self, config):
        fields = super()._load_pos_data_fields(config)
        # Add qty_available for stock alerts
        if 'qty_available' not in fields:
            fields.append('qty_available')
        if 'composition' not in fields:
            fields.append('composition')
        if 'composition_text' not in fields:
            fields.append('composition_text')
        if 'is_box_product' not in fields:
            fields.append('is_box_product')
        if 'envelope_child_id' not in fields:
            fields.append('envelope_child_id')
        if 'envelopes_per_box' not in fields:
            fields.append('envelopes_per_box')
        if 'parent_box_id' not in fields:
            fields.append('parent_box_id')
        if 'code' not in fields:
            fields.append('code')
        if 'envelope_price' not in fields:
            fields.append('envelope_price')
        if 'envelope_qty' not in fields:
            fields.append('envelope_qty')
        if 'box_qty' not in fields:
            fields.append('box_qty')
        return fields

    @api.model
    def _load_pos_data_read(self, records, config):
        res = super()._load_pos_data_read(records, config)
        # Explicitly ensure qty_available is in the results as a float
        product_map = {p.id: p.qty_available for p in records}
        for r in res:
            r['qty_available'] = product_map.get(r['id'], 0.0)
        return res

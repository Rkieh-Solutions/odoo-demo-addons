from odoo import api, models

class ProductProduct(models.Model):
    _inherit = 'product.product'

    @api.model
    def _load_pos_data_fields(self, config):
        fields = super()._load_pos_data_fields(config)
        extra = [
            'is_box_product', 
            'envelopes_per_box', 
            'envelope_price',
            'envelope_qty', 
            'box_qty', 
            'envelope_child_id', 
            'parent_box_id',
            'composition', 
            'composition_text',
            'code',
            'qty_available'
        ]
        for f in extra:
            if f not in fields:
                fields.append(f)
        return fields

    @api.model
    def _load_pos_data_read(self, records, config):
        res = super()._load_pos_data_read(records, config)
        product_map = {p.id: p.qty_available for p in records}
        for r in res:
            r['qty_available'] = product_map.get(r['id'], 0.0)
        return res

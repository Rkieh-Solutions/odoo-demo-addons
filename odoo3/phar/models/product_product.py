from odoo import api, models

class ProductProduct(models.Model):
    _inherit = 'product.product'

    @api.model
    def _load_pos_data_fields(self, config_id):
        fields = super()._load_pos_data_fields(config_id)
        # Add qty_available for stock alerts
        if 'qty_available' not in fields:
            fields.append('qty_available')
        if 'composition' not in fields:
            fields.append('composition')
        if 'composition_text' not in fields:
            fields.append('composition_text')
        return fields

    @api.model
    def _load_pos_data_read(self, records, config):
        res = super()._load_pos_data_read(records, config)
        # Explicitly ensure qty_available is in the results as a float
        product_map = {p.id: p.qty_available for p in records}
        for r in res:
            r['qty_available'] = product_map.get(r['id'], 0.0)
        return res

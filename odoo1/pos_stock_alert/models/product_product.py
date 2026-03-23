from odoo import api, models

class ProductProduct(models.Model):
    _inherit = 'product.product'

    @api.model
    def _load_pos_data_fields(self, config_id):
        fields = super()._load_pos_data_fields(config_id)
        # Ensure our custom fields and qty_available are loaded
        extra = ['qty_available', 'x_qty_to_warn']
        for f in extra:
            if f not in fields:
                fields.append(f)
        return fields

    @api.model
    def _load_pos_data_read(self, records, config_id):
        res = super()._load_pos_data_read(records, config_id)
        # Explicitly ensure qty_available is in the results as a float
        product_map = {p.id: p.qty_available for p in records}
        for r in res:
            r['qty_available'] = product_map.get(r['id'], 0.0)
        return res

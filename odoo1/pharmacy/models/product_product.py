from odoo import api, models

class ProductProduct(models.Model):
    _inherit = 'product.product'

    composition_text = fields.Char(related='product_tmpl_id.composition_text', readonly=True)

    @api.model
    def _load_pos_data_fields(self, config):
        fields = super()._load_pos_data_fields(config)
        fields += ['is_box_product', 'envelope_child_id', 'qty_available', 'envelopes_per_box', 'composition_text']
        return fields

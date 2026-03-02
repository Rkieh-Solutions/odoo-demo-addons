from odoo import api, models

class ProductTemplatePos(models.Model):
    """Expose custom pharmacy fields to the POS frontend (template level)."""
    _inherit = 'product.template'

    @api.model
    def _load_pos_data_fields(self, config_id):
        fields = super()._load_pos_data_fields(config_id)
        extra = [
            'code', 'atc_id', 'is_box_product', 'composition', 'composition_text',
            'qty_available', 'standard_price', 'list_price',
            'envelopes_per_box', 'envelope_price', 'envelope_qty', 'box_qty',
            'envelope_child_id', 'parent_box_id'
        ]
        for f in extra:
            if f not in fields:
                fields.append(f)
        return fields

class ProductProductPos(models.Model):
    """Expose custom pharmacy fields to the POS frontend (variant level)."""
    _inherit = 'product.product'

    @api.model
    def _load_pos_data_fields(self, config):
        fields = super()._load_pos_data_fields(config)
        extra = [
            'code', 'atc_id', 'is_box_product', 'composition', 'composition_text',
            'qty_available', 'standard_price', 'list_price',
            'envelopes_per_box', 'envelope_price', 'envelope_qty', 'box_qty',
            'envelope_child_id', 'parent_box_id'
        ]
        for f in extra:
            if f not in fields:
                fields.append(f)
        return fields

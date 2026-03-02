from odoo import api, models

class ProductTemplatePos(models.Model):
    """Expose custom pharmacy fields to the POS frontend (template level)."""
    _inherit = 'product.template'

    @api.model
    def _loader_params_product_template(self):
        params = super()._loader_params_product_template()
        params['search_params']['fields'].extend([
            'phm_code', 'atc_id', 'is_box_product', 'composition', 'composition_text',
            'qty_available', 'standard_price', 'list_price',
            'envelopes_per_box', 'envelope_price', 'envelope_qty', 'box_qty',
            'envelope_child_id', 'parent_box_id', 'form_id', 'strength_id', 'presentation_id'
        ])
        return params

class ProductProductPos(models.Model):
    """Expose custom pharmacy fields to the POS frontend (variant level)."""
    _inherit = 'product.product'

    @api.model
    def _loader_params_product_product(self):
        params = super()._loader_params_product_product()
        params['search_params']['fields'].extend([
            'phm_code', 'atc_id', 'is_box_product', 'composition', 'composition_text',
            'qty_available', 'standard_price', 'list_price',
            'envelopes_per_box', 'envelope_price', 'envelope_qty', 'box_qty',
            'envelope_child_id', 'parent_box_id', 'form_id', 'strength_id', 'presentation_id'
        ])
        return params

from odoo import api, models


class PosSession(models.Model):
    _inherit = 'pos.session'

    def _loader_params_product_product(self):
        result = super()._loader_params_product_product()
        # Add all technical pharmacy fields required by the JS frontend
        extra_fields = [
            'is_box_product', 
            'envelopes_per_box', 
            'envelope_price',
            'envelope_qty', 
            'box_qty', 
            'envelope_child_id', 
            'parent_box_id',
            'composition', 
            'composition_text',
            'code'
        ]
        for field in extra_fields:
            if field not in result['search_params']['fields']:
                result['search_params']['fields'].append(field)
        return result

    def _loader_params_product_template(self):
        result = super()._loader_params_product_template()
        extra_fields = [
            'is_box_product', 
            'envelopes_per_box', 
            'envelope_price',
            'envelope_qty', 
            'box_qty', 
            'envelope_child_id', 
            'parent_box_id',
            'composition', 
            'composition_text',
            'code'
        ]
        if 'search_params' not in result:
            result['search_params'] = {'fields': []}
        
        for field in extra_fields:
            if field not in result['search_params']['fields']:
                result['search_params']['fields'].append(field)
        return result

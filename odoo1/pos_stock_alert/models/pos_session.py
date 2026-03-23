from odoo import models, fields, api

class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    x_global_stock_warn_threshold = fields.Float(
        string='Global Stock Warning Threshold',
        config_parameter='pos_stock_alert.global_warn_threshold',
        default=0.0,
        help='Default threshold for all products if they have 0 specifically set.'
    )

class PosConfig(models.Model):
    _inherit = 'pos.config'

    x_global_stock_warn_threshold = fields.Float(
        string='Global Stock Warning Threshold',
        compute='_compute_global_threshold',
        help='Default threshold fetched from global settings.'
    )

    def _compute_global_threshold(self):
        param = self.env['ir.config_parameter'].sudo().get_param('pos_stock_alert.global_warn_threshold', 0.0)
        for config in self:
            config.x_global_stock_warn_threshold = float(param)

class PosSession(models.Model):
    _inherit = 'pos.session'

    def _loader_params_pos_config(self):
        result = super()._loader_params_pos_config()
        result['search_params']['fields'].append('x_global_stock_warn_threshold')
        return result

    def _loader_params_product_product(self):
        result = super()._loader_params_product_product()
        result['search_params']['fields'].extend(['qty_available', 'x_qty_to_warn'])
        return result

    def _pos_data_process(self, loaded_data):
        super()._pos_data_process(loaded_data)
        if 'product.product' in loaded_data:
            # Manually inject qty_available to avoid loader mismatch
            product_ids = [p['id'] for p in loaded_data['product.product']]
            products = self.env['product.product'].with_context(
                location=self.config_id.picking_type_id.default_location_src_id.id
            ).browse(product_ids)
            qty_map = {p.id: p.qty_available for p in products}
            for p in loaded_data['product.product']:
                p['qty_available'] = qty_map.get(p['id'], 0.0)

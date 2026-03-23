from odoo import models, fields

class PosConfig(models.Model):
    _inherit = 'pos.config'

    x_global_stock_warn_threshold = fields.Float(string='Global Stock Warning Threshold', default=0.0, help='Default threshold for all products if they have 0 specifically set.')

class PosSession(models.Model):
    _inherit = 'pos.session'

    def _loader_params_product_product(self):
        result = super()._loader_params_product_product()
        result['search_params']['fields'].append('x_qty_to_warn')
        return result

    def _pos_data_process(self, loaded_data):
        super()._pos_data_process(loaded_data)
        # No extra process needed if we just want it in the config

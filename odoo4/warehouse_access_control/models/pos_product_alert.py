from odoo import api, fields, models


class ProductTemplatePosAlert(models.Model):
    _inherit = 'product.template'

    x_qty_to_warn = fields.Float(string='POS Warning Threshold', default=0.0)

    @api.model
    def _load_pos_data_fields(self, config):
        params = super()._load_pos_data_fields(config)
        params.append('x_qty_to_warn')
        return params

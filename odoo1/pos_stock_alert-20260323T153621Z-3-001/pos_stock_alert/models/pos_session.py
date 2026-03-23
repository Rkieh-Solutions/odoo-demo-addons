from odoo import models, fields, api
import logging

_logger = logging.getLogger(__name__)

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

    @api.model
    def _load_pos_data_fields(self, config):
        params = super()._load_pos_data_fields(config)
        if params:
            if 'x_global_stock_warn_threshold' not in params:
                params.append('x_global_stock_warn_threshold')
        return params

    @api.model
    def _load_pos_data_read(self, records, config):
        res = super()._load_pos_data_read(records, config)
        for record in res:
            if 'x_global_stock_warn_threshold' not in record:
                conf = self.browse(record['id'])
                record['x_global_stock_warn_threshold'] = conf.x_global_stock_warn_threshold
        return res

class PosSession(models.Model):
    _inherit = 'pos.session'
    # Odoo 20 does not require manual _loader_params or _pos_data_process for basic fields
    # as models handle their own _load_pos_data_fields.

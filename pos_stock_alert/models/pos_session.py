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
        # If the base returns an empty list, it usually means "read all fields" for pos.config
        # We should only append if we want to limit it, but actually for pos.config,
        # it's better to just ensure it's not empty if we add our field, 
        # but wait, if it's empty, Odoo might return everything.
        # If we return ['our_field'], Odoo returns ONLY our field.
        # So we must avoid returning a list with only our field if super is empty.
        if params:
            if 'x_global_stock_warn_threshold' not in params:
                params.append('x_global_stock_warn_threshold')
        # If params is empty, we don't return ['x_global_stock_warn_threshold'] 
        # because that would strip all other fields (name, currency_id, etc.)
        # Instead, we rely on _load_pos_data_read to add it if needed or 
        # we can return a minimal set if we REALLY need it.
        # However, it's safer to just return params (empty) and handle it in read.
        return params

    @api.model
    def _load_pos_data_read(self, records, config):
        res = super()._load_pos_data_read(records, config)
        for record in res:
            # Inject our field if it was not loaded (because fields=[])
            if 'x_global_stock_warn_threshold' not in record:
                # We can't easily fetch it here without another read, but records is already a list of dicts.
                # Actually, if we want it in the JS, it MUST be in the dict.
                conf = self.browse(record['id'])
                record['x_global_stock_warn_threshold'] = conf.x_global_stock_warn_threshold
        return res

class PosSession(models.Model):
    _inherit = 'pos.session'
    # No longer need manual _loader_params or _pos_data_process for qty_available
    # as product.product will handle its own field loading.

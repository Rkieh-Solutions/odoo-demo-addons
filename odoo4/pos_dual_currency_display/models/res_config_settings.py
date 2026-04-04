from odoo import fields, models

class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    pos_show_dual_currency = fields.Boolean(related='pos_config_id.show_dual_currency', readonly=False)
    pos_secondary_currency_id = fields.Many2one('res.currency', related='pos_config_id.secondary_currency_id', readonly=False)

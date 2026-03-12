from odoo import api, fields, models

class PosConfig(models.Model):
    _inherit = 'pos.config'

    show_dual_currency = fields.Boolean(string='Show Dual Currency', default=True)
    secondary_currency_id = fields.Many2one('res.currency', string='Secondary Currency')

    @api.model
    def _load_pos_data_read(self, records, config):
        read_records = super()._load_pos_data_read(records, config)
        if read_records:
            record = read_records[0]
            # Use _ prefix pattern like Odoo does for _server_version, _base_url etc.
            # This bypasses the frontend Proxy which drops unknown _id suffixed fields.
            record['_show_dual_currency'] = config.show_dual_currency
            record['_secondary_currency_id'] = config.secondary_currency_id.id if config.secondary_currency_id else False
        return read_records

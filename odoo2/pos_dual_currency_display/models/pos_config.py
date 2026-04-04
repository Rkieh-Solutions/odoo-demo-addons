from odoo import fields, models, api

class PosConfig(models.Model):
    _inherit = 'pos.config'

    show_dual_currency = fields.Boolean(string='Show Dual Currency', default=True)
    secondary_currency_id = fields.Many2one('res.currency', string='Secondary Currency')

    @api.model
    def _load_pos_data_read(self, records, config):
        # We don't override _load_pos_data_fields so that super() reads all default fields.
        read_records = super()._load_pos_data_read(records, config)
        if read_records:
            # Inject our custom fields into the read records
            custom_fields = ["show_dual_currency", "secondary_currency_id"]
            custom_data = records.read(custom_fields, load=False)
            for record, custom_record in zip(read_records, custom_data):
                record.update(custom_record)
        return read_records

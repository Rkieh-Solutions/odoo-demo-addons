from odoo import models, api
from odoo.fields import Domain

class ResCurrency(models.Model):
    _inherit = 'res.currency'

    @api.model
    def _load_pos_data_fields(self, config):
        fields_list = super()._load_pos_data_fields(config)
        for field_name in ["id", "name", "symbol", "position", "rounding", "rate", "decimal_places"]:
            if field_name not in fields_list:
                fields_list.append(field_name)
        return fields_list

    @api.model
    def _load_pos_data_domain(self, data, config):
        domain = super()._load_pos_data_domain(data, config)
        currency_ids = {config.currency_id.id}
        if config.secondary_currency_id:
            currency_ids.add(config.secondary_currency_id.id)
        return Domain.AND([domain, [("id", "in", list(currency_ids))]])

import logging
from odoo import models, api

_logger = logging.getLogger(__name__)


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
        # Collect ALL currency IDs we need (company + config + secondary)
        currency_ids = set()
        currency_ids.add(config.company_id.currency_id.id)
        currency_ids.add(config.currency_id.id)
        if config.secondary_currency_id:
            currency_ids.add(config.secondary_currency_id.id)
        _logger.info("POS Dual Currency: loading currencies with IDs %s", currency_ids)
        return [("id", "in", list(currency_ids))]

    @api.model
    def _load_pos_data_search_read(self, data, config):
        """Override to bypass active_test so inactive currencies are still loaded."""
        domain = self._load_pos_data_domain(data, config)
        if domain is False:
            return []
        # Use active_test=False to include inactive currencies (e.g. USD may be inactive)
        records = self.with_context(active_test=False).search(domain)
        _logger.info("POS Dual Currency: found %d currency records: %s", len(records), records.mapped('name'))
        return self._load_pos_data_read(records, config)

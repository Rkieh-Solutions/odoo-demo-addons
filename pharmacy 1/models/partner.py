from odoo import api, models

# Global helper for consistency with product_template logic
_GARBAGE_VALUES = {
    '#ref!', '#n/a', '#value!', '#div/0!',
    '#name?', '#null!', '#num!', '#error!',
    'n/a', 'na', '-',
}

def _clean(val):
    """Strip whitespace; return '' for Excel errors and N/A-like values."""
    v = (val or '').strip()
    return '' if v.lower() in _GARBAGE_VALUES else v


class ResPartner(models.Model):
    _inherit = "res.partner"

    @api.model
    def name_create(self, name):
        """Block creation of junk partners during lookups (e.g. from Odoo standard CSV import)."""
        if not _clean(name):
            # Returning False prevents Odoo from creating a junk partner like '#REF!'
            return False
        return super().name_create(name)

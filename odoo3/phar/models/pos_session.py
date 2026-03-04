from odoo import models

class PosSession(models.Model):
    _inherit = 'pos.session'
    # No overrides needed for Odoo 20 as product loader mixins handle field synchronization.

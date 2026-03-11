from odoo import models

class PosSession(models.Model):
    _inherit = 'pos.session'

class ResPartner(models.Model):
    _inherit = 'res.partner'

class PosOrderLine(models.Model):
    _inherit = 'pos.order.line'

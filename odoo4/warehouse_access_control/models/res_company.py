from odoo import models, fields

class ResCompany(models.Model):
    _inherit = 'res.company'
    
    quality_excellent_limit = fields.Float("Excellent Max Threshold (%)", default=5.0, store=False)
    quality_good_limit = fields.Float("Good Max Threshold (%)", default=15.0, store=False)
    quality_average_limit = fields.Float("Average Max Threshold (%)", default=30.0, store=False)

class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'
    
    quality_excellent_limit = fields.Float(related='company_id.quality_excellent_limit', readonly=False)
    quality_good_limit = fields.Float(related='company_id.quality_good_limit', readonly=False)
    quality_average_limit = fields.Float(related='company_id.quality_average_limit', readonly=False)

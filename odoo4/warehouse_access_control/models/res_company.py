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

    x_global_stock_warn_threshold = fields.Float(
        string='Global Stock Warning Threshold',
        config_parameter='warehouse_access_control.global_warn_threshold',
        default=0.0,
        help='Default threshold for all products if they have 0 specifically set.'
    )

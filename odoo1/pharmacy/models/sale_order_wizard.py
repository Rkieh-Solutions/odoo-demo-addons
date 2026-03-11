from odoo import models, fields, api

class SaleOrderOpenBoxWizard(models.TransientModel):
    _name = 'sale.order.open.box.wizard'
    _description = 'Open Box Wizard'
    
    message = fields.Text(readonly=True)

    def action_open_boxes_and_confirm(self):
        pass

    def action_cancel(self):
        pass

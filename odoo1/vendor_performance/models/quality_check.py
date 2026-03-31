# -*- coding: utf-8 -*-
from odoo import models, fields, api

class QualityCheck(models.Model):
    _inherit = 'quality.check'

    def action_pass(self):
        res = super(QualityCheck, self).action_pass()
        for check in self:
            if check.partner_id:
                # We assume qty is available on the check or linked move
                qty = check.qty if hasattr(check, 'qty') else 1.0
                check.partner_id.accepted_qty += qty
        return res

    def action_fail(self):
        res = super(QualityCheck, self).action_fail()
        for check in self:
            if check.partner_id:
                qty = check.qty if hasattr(check, 'qty') else 1.0
                check.partner_id.failed_qty += qty
        return res

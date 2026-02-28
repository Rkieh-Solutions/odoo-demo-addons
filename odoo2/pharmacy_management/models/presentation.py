from odoo import models, fields


class PharmacyPresentation(models.Model):
    _name = 'pharmacy.presentation'
    _description = 'Drug Presentation'
    _order = 'name'

    name = fields.Char(string='Presentation', required=True, index=True)
    active = fields.Boolean(default=True)

    _sql_constraints = [
        ('name_unique', 'UNIQUE(name)', 'Presentation name must be unique.'),
    ]

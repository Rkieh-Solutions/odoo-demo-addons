from odoo import models, fields


class PharmacyPresentation(models.Model):
    _name = 'pharmacy.presentation'
    _description = 'Drug Presentation'
    _order = 'name'

    name = fields.Char(string='Presentation', required=True, index=True)
    active = fields.Boolean(default=True)

    # Odoo 19: SQL constraints are defined as Constraint attributes
    _name_unique = models.Constraint(
        'UNIQUE(name)',
        'Presentation name must be unique.'
    )

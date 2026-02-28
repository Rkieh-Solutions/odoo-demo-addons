from odoo import models, fields


class PharmacyStratum(models.Model):
    _name = 'pharmacy.stratum'
    _description = 'Drug Stratum'
    _order = 'name'

    name = fields.Char(string='Name', required=True, index=True)
    active = fields.Boolean(default=True)

    # Odoo 19: SQL constraints are defined as Constraint attributes
    _name_unique = models.Constraint(
        'UNIQUE(name)',
        'Stratum name must be unique.'
    )

from odoo import models, fields


class PharmacyStrength(models.Model):
    _name = 'pharmacy.strength'
    _description = 'Drug Strength'
    _order = 'name'

    name = fields.Char(string='StrengthValue', required=True, index=True)
    active = fields.Boolean(default=True)

    # Odoo 19: SQL constraints are defined as Constraint attributes
    _name_unique = models.Constraint(
        'UNIQUE(name)',
        'Strength name must be unique.'
    )

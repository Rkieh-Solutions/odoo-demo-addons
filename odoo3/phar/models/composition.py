from odoo import models, fields


class PharmacyComposition(models.Model):
    _name = 'pharmacy.composition'
    _description = 'Drug Ingredient'
    _order = 'name'

    name = fields.Char(
        string='Ingredient Name',
        required=True,
        index=True
    )

    active = fields.Boolean(default=True)
    color = fields.Integer(string='Color Index')

    # Odoo 19: SQL constraints are defined as Constraint attributes
    _name_unique = models.Constraint(
        'UNIQUE(name)',
        'Ingredient name must be unique.'
    )
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

    _sql_constraints = [
        ('name_unique', 'UNIQUE(name)', 'Ingredient name must be unique.'),
    ]
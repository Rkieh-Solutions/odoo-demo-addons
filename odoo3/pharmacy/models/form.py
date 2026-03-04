from odoo import models, fields


class PharmacyForm(models.Model):
    _name = 'pharmacy.form'
    _description = 'Drug Form'
    _order = 'name'

    name = fields.Char(
        string='Form Name',
        required=True,
        index=True,
    )

    active = fields.Boolean(default=True)

    _name_unique = models.Constraint(
        'UNIQUE(name)',
        'Form name must be unique.',
    )

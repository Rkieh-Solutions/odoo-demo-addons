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

    _sql_constraints = [
        ('name_unique', 'UNIQUE(name)', 'Form name must be unique.'),
    ]

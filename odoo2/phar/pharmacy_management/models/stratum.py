from odoo import models, fields


class PharmacyStratum(models.Model):
    _name = 'pharmacy.stratum'
    _description = 'Drug Stratum'
    _order = 'name'

    name = fields.Char(string='Name', required=True, index=True)
    active = fields.Boolean(default=True)

    _sql_constraints = [
        ('name_unique', 'UNIQUE(name)', 'Stratum name must be unique.'),
    ]

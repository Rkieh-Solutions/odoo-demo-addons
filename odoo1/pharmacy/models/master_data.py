from odoo import fields, models

class ATC(models.Model):
    _name = 'pharmacy.atc'
    _description = 'ATC Code'
    name = fields.Char(required=True)

class Form(models.Model):
    _name = 'pharmacy.form'
    _description = 'Drug Form'
    name = fields.Char(required=True)

class Strength(models.Model):
    _name = 'pharmacy.strength'
    _description = 'Drug Strength'
    name = fields.Char(required=True)

class Presentation(models.Model):
    _name = 'pharmacy.presentation'
    _description = 'Drug Presentation'
    name = fields.Char(required=True)

class Stratum(models.Model):
    _name = 'pharmacy.stratum'
    _description = 'Drug Stratum'
    name = fields.Char(required=True)

class Composition(models.Model):
    _name = 'pharmacy.composition'
    _description = 'Drug Ingredient'
    name = fields.Char(required=True)
    color = fields.Integer()

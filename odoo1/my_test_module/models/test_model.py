from odoo import models, fields

class TestModel(models.Model):
    _name = 'my_test_module.test_model'
    _description = 'Test Model'

    name = fields.Char(string='Name', required=True)
    description = fields.Text(string='Description')

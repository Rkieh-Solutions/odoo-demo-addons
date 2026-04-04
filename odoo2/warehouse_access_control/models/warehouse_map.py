from odoo import models, fields

class WarehouseMap(models.Model):
    _name = 'warehouse.map'
    _description = 'Warehouse Visual Map Configuration'
    
    name = fields.Char(string='Map Name', required=True, default='Main Warehouse Blueprint')
    image = fields.Image(string='Map Upload (Image)', max_width=1920, max_height=1920)
    active = fields.Boolean(default=True)

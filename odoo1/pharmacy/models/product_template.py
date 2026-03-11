from odoo import api, fields, models

class ProductTemplate(models.Model):
    _inherit = "product.template"

    is_box_product = fields.Boolean(string='Box')
    envelope_child_id = fields.Many2one('product.template', string='Envelope/Child Product')
    parent_box_id = fields.Many2one('product.template', string='Parent Box Product')
    envelopes_per_box = fields.Integer(string='Envelopes in Box', default=1)
    envelope_price = fields.Float(string='Envelope Price')

    def action_open_new_box(self):
        self.ensure_one()
        if self.qty_available < 1:
            return {
                'type': 'ir.actions.client',
                'tag': 'display_notification',
                'params': {
                    'title': 'Warning: Out of Stock!',
                    'message': f'Warning: the product ({self.name}) is out of stock. The requested quantity is not available in inventory.',
                    'type': 'danger',
                }
            }
        
        if not self.envelope_child_id:
             return {
                'type': 'ir.actions.client',
                'tag': 'display_notification',
                'params': {
                    'title': 'Configuration Missing',
                    'message': 'No child product linked.',
                    'type': 'warning',
                }
            }

        warehouse = self.env['stock.warehouse'].search([], limit=1)
        location = warehouse.lot_stock_id if warehouse else None
        if not location:
            return

        box_product = self.product_variant_id
        env_product = self.envelope_child_id.product_variant_id

        self.env['stock.quant']._update_available_quantity(box_product, location, -1)
        self.env['stock.quant']._update_available_quantity(env_product, location, self.envelopes_per_box)

        return True

    def action_create_child_and_open(self, name):
        self.ensure_one()
        child_vals = {
            'name': name,
            'type': self.type,
            'list_price': self.envelope_price or (self.list_price / (self.envelopes_per_box or 1)),
            'standard_price': self.standard_price / (self.envelopes_per_box or 1),
            'parent_box_id': self.id,
            'available_in_pos': True,
            'tracking': 'none',
        }
        child_template = self.env['product.template'].create(child_vals)
        self.write({'envelope_child_id': child_template.id, 'is_box_product': True})
        return self.action_open_new_box()

    @api.model
    def _load_pos_data_fields(self, config):
        fields = super()._load_pos_data_fields(config)
        fields += ['is_box_product', 'envelope_child_id', 'qty_available', 'envelopes_per_box']
        return fields

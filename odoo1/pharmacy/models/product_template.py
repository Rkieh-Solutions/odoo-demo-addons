from odoo import api, fields, models
import logging

_logger = logging.getLogger(__name__)

class ProductTemplate(models.Model):
    _inherit = "product.template"

    # Box Management
    is_box_product = fields.Boolean(string='Box')
    envelope_child_id = fields.Many2one('product.template', string='Envelope/Child Product')
    parent_box_id = fields.Many2one('product.template', string='Parent Box Product')
    envelopes_per_box = fields.Integer(string='Envelopes in Box', default=1)
    envelope_price = fields.Float(string='Envelope Price')
    envelope_qty = fields.Float(string='Available Loose Envelopes', compute='_compute_envelope_qty')

    # Drug Information (Pharmacy Management Tab)
    code = fields.Char(string="Pharmacy Code")
    registration_number = fields.Char(string="Registration No.")
    pharmacy_margin_input = fields.Float(string="Pharmacy Margin (%)")
    pharmacy_margin = fields.Float(string="Actual Margin", compute='_compute_pharmacy_margin')
    
    atc_id = fields.Many2one('pharmacy.atc', string="ATC Code")
    form_id = fields.Many2one('pharmacy.form', string="Form")
    strength_id = fields.Many2one('pharmacy.strength', string="Strength")
    presentation_id = fields.Many2one('pharmacy.presentation', string="Presentation")
    stratum_id = fields.Many2one('pharmacy.stratum', string="Stratum")
    composition = fields.Many2many('pharmacy.composition', string="Ingredients")
    composition_text = fields.Char(string="Composition Summary", compute='_compute_composition_text')
    
    agent_id = fields.Many2one('res.partner', string="Regulatory Agent")
    responsible_party_id = fields.Many2one('res.partner', string="Responsible Party")

    def _compute_envelope_qty(self):
        for template in self:
            if template.is_box_product and template.envelope_child_id:
                template.envelope_qty = template.envelope_child_id.qty_available
            else:
                template.envelope_qty = 0.0

    @api.depends('pharmacy_margin_input')
    def _compute_pharmacy_margin(self):
        for rec in self:
            rec.pharmacy_margin = rec.pharmacy_margin_input

    @api.depends('composition')
    def _compute_composition_text(self):
        for t in self:
            t.composition_text = ", ".join(t.composition.mapped('name'))

    def action_open_new_box(self):
        self.ensure_one()
        if self.qty_available < 1:
            return {
                'type': 'ir.actions.client',
                'tag': 'display_notification',
                'params': {
                    'title': 'Warning: Out of Stock!',
                    'message': f'Waring :the product ({self.name}) is out of stock , \nThe requested quantity is not available in inventory',
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

        # Update quantities
        self.env['stock.quant']._update_available_quantity(box_product, location, -1)
        self.env['stock.quant']._update_available_quantity(env_product, location, self.envelopes_per_box)

        return True

    def action_create_child_and_open(self, name):
        self.ensure_one()
        child_vals = {
            'name': name,
            'type': 'consu', # Fallback to consumable if storable/product fail
            'list_price': self.envelope_price or (self.list_price / (self.envelopes_per_box or 1)),
            'standard_price': self.standard_price / (self.envelopes_per_box or 1),
            'parent_box_id': self.id,
            'available_in_pos': True,
            'tracking': 'none', # AS REQUESTED: No child lots
        }
        child_template = self.env['product.template'].create(child_vals)
        self.write({'envelope_child_id': child_template.id, 'is_box_product': True})
        return self.action_open_new_box()

    @api.model
    def _load_pos_data_fields(self, config):
        fields = super()._load_pos_data_fields(config)
        fields += ['is_box_product', 'envelope_child_id', 'qty_available', 'envelopes_per_box']
        return fields

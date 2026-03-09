from odoo import api, fields, models

class ProductProduct(models.Model):
    _inherit = 'product.product'

    code = fields.Char(related='product_tmpl_id.code', string="Code", store=True, index=True)
    is_box_product = fields.Boolean(related='product_tmpl_id.is_box_product', string='Box')
    envelope_child_id = fields.Many2one('product.template', related='product_tmpl_id.envelope_child_id', string='Envelope/Child Product')
    parent_box_id = fields.Many2one('product.template', related='product_tmpl_id.parent_box_id', string='Parent Box Product')
    envelopes_per_box = fields.Integer(related='product_tmpl_id.envelopes_per_box', string='Envelopes in Box')
    envelope_price = fields.Float(related='product_tmpl_id.envelope_price', string='Envelope Price')
    envelope_qty = fields.Integer(related='product_tmpl_id.envelope_qty', string='Envelope Qty')
    box_qty = fields.Integer(related='product_tmpl_id.box_qty', string='Box Qty')

    @api.model
    def _load_pos_data_fields(self, config):
        fields = super()._load_pos_data_fields(config)
        extra = [
            'is_box_product', 'envelopes_per_box', 'envelope_price',
            'envelope_qty', 'box_qty', 'envelope_child_id', 'parent_box_id',
            'code', 'composition', 'composition_text'
        ]
        for f in extra:
            if f not in fields:
                fields.append(f)
        return fields

    @api.model
    def _load_pos_data_read(self, records, config):
        res = super()._load_pos_data_read(records, config)
        # Robustly augment data without breaking standard Odoo structures
        product_map = {p.id: p for p in records}
        for r in res:
            p = product_map.get(r['id'])
            if p:
                r['qty_available'] = p.qty_available or 0.0
                r['envelope_qty'] = p.envelope_qty or 0
                r['box_qty'] = p.box_qty or 0
                r['is_box_product'] = p.is_box_product or False
        return res

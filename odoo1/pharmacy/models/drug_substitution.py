from odoo import api, fields, models
from odoo.exceptions import ValidationError

class ProductTemplateSubstitution(models.Model):
    _inherit = "product.template"

    def get_substitute_products(self, match_mode='overlap', in_stock_only=True, limit=20):
        """Find alternative products based on composition or ATC."""
        if not self: return []
        self.ensure_one()
        ingredient_ids = self.composition.ids
        domain = [('id', '!=', self._origin.id if hasattr(self, '_origin') else self.id)]

        if ingredient_ids:
            if match_mode == 'overlap':
                domain.append(('composition', 'in', ingredient_ids))
            elif match_mode == 'exact':
                domain.append(('composition', 'in', ingredient_ids))
            templates = self.search(domain)
            if match_mode == 'exact':
                target_set = set(ingredient_ids)
                templates = templates.filtered(lambda t: set(t.composition.ids) == target_set)
        elif self.atc_id:
            domain.append(('atc_id', '=', self.atc_id.id))
            templates = self.search(domain, limit=limit)
        else:
            return []

        if in_stock_only:
            templates = templates.filtered(lambda t: t.qty_available > 0)

        results = []
        for t in templates[:limit]:
            variant = t.product_variant_id or t.product_variant_ids[:1]
            if not variant: continue
            results.append({
                'id': t.id,
                'product_id': variant.id,
                'display_name': t.display_name,
                'composition_text': t.composition_text,
                'qty_available': t.qty_available,
            })
        return results

class PharmacySubstituteWizard(models.TransientModel):
    _name = 'pharmacy.substitute'
    _description = 'Drug Substitution'

    product_id = fields.Many2one('product.product', string='Product', readonly=True)
    match_mode = fields.Selection([('overlap', 'Ingredient Overlap'), ('exact', 'Exact Set')], string='Mode', default='overlap', required=True)
    in_stock_only = fields.Boolean(string='In Stock Only', default=True)
    limit = fields.Integer(string='Limit', default=20)
    line_ids = fields.One2many('pharmacy.substitute.line', 'wizard_id', string='Substitutes')
    
    @api.onchange('product_id', 'match_mode', 'in_stock_only', 'limit')
    def _onchange_options(self):
        self.line_ids = [(5, 0, 0)]
        if not self.product_id: return
        alts_data = self.product_id.product_tmpl_id.get_substitute_products(self.match_mode, self.in_stock_only, self.limit)
        lines = []
        for data in alts_data:
            lines.append((0, 0, {
                'product_id': data['product_id'],
                'composition_text': data['composition_text'],
                'qty_available': data['qty_available'],
            }))
        self.line_ids = lines

class PharmacySubstituteLine(models.TransientModel):
    _name = 'pharmacy.substitute.line'
    _description = 'Substitution Candidate'
    wizard_id = fields.Many2one('pharmacy.substitute')
    product_id = fields.Many2one('product.product', string='Product')
    composition_text = fields.Char(string='Ingredients')
    qty_available = fields.Float(string='Stock')

    def action_replace(self):
        self.ensure_one()
        return {
            'type': 'ir.actions.client',
            'tag': 'substitute_replace',
            'params': {
                'product_id': self.product_id.id,
                'product_name': self.product_id.display_name,
            }
        }

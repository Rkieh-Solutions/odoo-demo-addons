from odoo import api, fields, models
from odoo.exceptions import ValidationError

class ProductTemplateSubstitution(models.Model):
    _inherit = "product.template"

    def get_substitute_products(self, match_mode='overlap', in_stock_only=True, limit=20):
        """Find alternative products based on composition or ATC. Returns list of dicts."""
        import logging
        _logger = logging.getLogger(__name__)
        _logger.info("Substitution: Called for template %s (%s)", self.id, self.name)
        
        self.ensure_one()
        ingredient_ids = self.composition.ids
        _logger.info("Substitution: Ingredients found: %s", ingredient_ids)
        
        domain = [('id', '!=', self.id)]

        if ingredient_ids:
            if match_mode == 'overlap':
                domain.append(('composition', 'in', ingredient_ids))
            elif match_mode == 'exact':
                domain.append(('composition', 'in', ingredient_ids))
            
            _logger.info("Substitution: Searching with domain %s", domain)
            templates = self.search(domain, limit=limit * 5)
            _logger.info("Substitution: Search found %s templates", len(templates))
            
            if match_mode == 'exact':
                target_set = set(ingredient_ids)
                templates = templates.filtered(lambda t: set(t.composition.ids) == target_set)
                _logger.info("Substitution: Exact match filtered to %s", len(templates))
        elif self.atc_id:
            # Fallback to ATC if ingredients missing
            _logger.info("Substitution: Falling back to ATC %s", self.atc_id.name)
            domain.append(('atc_id', '=', self.atc_id.id))
            templates = self.search(domain, limit=limit)
        else:
            _logger.info("Substitution: No ingredients or ATC found")
            return []

        if in_stock_only:
            templates = templates.filtered(lambda t: t.qty_available > 0)
            _logger.info("Substitution: Stocks filtered to %s", len(templates))

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
        _logger.info("Substitution: Returning %s results", len(results))
        return results

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
            'tag': 'display_notification',
            'params': {
                'title': 'Feature info',
                'message': 'Substitution is handled directly in the POS interface.',
                'type': 'info',
                'sticky': False,
            }
        }

    def action_add_new(self):
        self.ensure_one()
        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': 'Feature info',
                'message': 'Adding new items is handled directly in the POS interface.',
                'type': 'info',
                'sticky': False,
            }
        }

class PharmacySubstituteWizard(models.TransientModel):
    _name = 'pharmacy.substitute'
    _description = 'Drug Substitution'

    product_id = fields.Many2one('product.product', string='Product', readonly=True)
    
    match_mode = fields.Selection([
        ('overlap', 'Ingredient Overlap'),
        ('exact', 'Exact Set')
    ], string='Mode', default='overlap', required=True)
    
    in_stock_only = fields.Boolean(string='In Stock Only', default=True)
    limit = fields.Integer(string='Limit', default=20)
    line_ids = fields.One2many('pharmacy.substitute.line', 'wizard_id', string='Substitutes')
    
    @api.onchange('product_id', 'match_mode', 'in_stock_only', 'limit')
    def _onchange_options(self):
        self.line_ids = [(5, 0, 0)]
        product = self.product_id
            
        if not product:
            return
        
        tpl = product.product_tmpl_id
        alts_data = tpl.get_substitute_products(self.match_mode, self.in_stock_only, self.limit)
        
        lines = []
        for data in alts_data:
            lines.append((0, 0, {
                'product_id': data['product_id'],
                'composition_text': data['composition_text'],
                'qty_available': data['qty_available'],
            }))
        self.line_ids = lines

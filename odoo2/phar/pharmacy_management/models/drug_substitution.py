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
        line_id = self.wizard_id.original_sale_line_id
        if not line_id:
            # POS context or missing ID
            return {
                'type': 'ir.actions.client',
                'tag': 'display_notification',
                'params': {
                    'title': 'Feature info',
                    'message': 'Substitution is typically handled directly in the POS interface.',
                    'type': 'info',
                    'sticky': False,
                }
            }
        
        target_product_id = self.product_id.id
        target_product_name = self.product_id.display_name

        line = self.env['sale.order.line'].sudo().browse(line_id)
        if line.exists() and isinstance(line_id, int):
            try:
                line.write({'product_id': target_product_id})
            except Exception:
                pass
            
        return {
            'type': 'ir.actions.client',
            'tag': 'substitute_replace',
            'params': {
                'product_id': target_product_id,
                'product_name': target_product_name,
                'sale_line_id': line_id,
            }
        }

    def action_add_new(self):
        self.ensure_one()
        line_id = self.wizard_id.original_sale_line_id
        if not line_id:
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
             
        orig = self.env['sale.order.line'].sudo().browse(line_id)
        if not orig.exists():
            raise ValidationError("Sale order line not found.")
            
        new_line = orig.copy({
            'order_id': orig.order_id.id, 
            'product_id': self.product_id.id
        })
        
        return {
            'type': 'ir.actions.client',
            'tag': 'substitute_replace',
            'params': {
                'product_id': self.product_id.id,
                'product_name': self.product_id.display_name,
            }
        }

class PharmacySubstituteWizard(models.TransientModel):
    _name = 'pharmacy.substitute'
    _description = 'Drug Substitution'

    original_sale_line_id = fields.Integer(string='Original Line ID')
    product_id = fields.Many2one('product.product', string='Product', readonly=True)
    
    match_mode = fields.Selection([
        ('overlap', 'Ingredient Overlap'),
        ('exact', 'Exact Set')
    ], string='Mode', default='overlap', required=True)
    
    in_stock_only = fields.Boolean(string='In Stock Only', default=True)
    limit = fields.Integer(string='Limit', default=20)
    line_ids = fields.One2many('pharmacy.substitute.line', 'wizard_id', string='Substitutes')
    
    @api.onchange('original_sale_line_id', 'product_id', 'match_mode', 'in_stock_only', 'limit')
    def _onchange_options(self):
        self.line_ids = [(5, 0, 0)]
        product = self.product_id
        if not product and self.original_sale_line_id:
            line = self.env['sale.order.line'].browse(self.original_sale_line_id)
            if not line.exists() and hasattr(self.original_sale_line_id, 'origin'):
                line = self.env['sale.order.line'].browse(self.original_sale_line_id.origin)
            product = line.product_id
            
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

class SaleOrderLineSubstitution(models.Model):
    _inherit = "sale.order.line"

    composition_text = fields.Char(related="product_id.product_tmpl_id.composition_text", store=True)

    def action_open_substitute_wizard(self):
        """Opens the search wizard to give options (auto-replace disabled per user request)."""
        self.ensure_one()
        if not self.product_id:
            raise ValidationError("Please select a product first.")

        # Get real ID even if it's a NewId record
        real_id = self._origin.id if hasattr(self, '_origin') and self._origin else self.id
        if not isinstance(real_id, int) and hasattr(real_id, 'origin'):
            real_id = real_id.origin

        return {
            'name': 'Find Substitutes',
            'type': 'ir.actions.act_window',
            'res_model': 'pharmacy.substitute',
            'view_mode': 'form',
            'target': 'new',
            'context': {
                'default_original_sale_line_id': real_id,
                'default_product_id': self.product_id.id,
            }
        }

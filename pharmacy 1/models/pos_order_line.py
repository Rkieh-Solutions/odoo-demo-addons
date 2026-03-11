import datetime
import logging
from odoo import api, fields, models, _

_logger = logging.getLogger(__name__)

class PosOrderLine(models.Model):
    _inherit = 'pos.order.line'

    @api.model
    def get_existing_lots(self, company_id, config_id, product_id):
        """
        Ultimate Permissive Version: Finds all lots for current product, variants, parent, 
        and name-matched products. Ensures visibility even if stock is 0.
        """
        try:
            _logger.info("PHARMACY RPC CALLED: product_id=%s, company_id=%s", product_id, company_id)
            product = self.env['product.product'].sudo().browse(product_id)
            if not product.exists(): 
                _logger.warning("PHARMACY RPC: Product %s does not exist", product_id)
                return []
            
            tmpl = product.product_tmpl_id
            
            # 1. Product Discovery
            variant_ids = tmpl.product_variant_ids.ids
            
            # Find Parents (Box)
            parent_ids = []
            parent_tmpl = product.parent_box_id or tmpl.parent_box_id
            if not parent_tmpl:
                parent_tmpl = self.env['product.template'].sudo().search([
                    ('envelope_child_id', 'in', [tmpl.id, product.id])
                ], limit=1)
            
            if parent_tmpl:
                parent_ids = parent_tmpl.product_variant_ids.ids
                _logger.info("PHARMACY RPC: Found parent relation %s (variants: %s)", parent_tmpl.name, parent_ids)
            
            # Fuzzy match for products with similar names
            fuzzy_ids = []
            # Use a more aggressive clean name: remove common pharmacy terms
            clean_search_name = product.name.lower()
            for term in ['envelope', 'box', 'piece', 'tablet', 'strip', '(', ')']:
                clean_search_name = clean_search_name.replace(term, '')
            clean_search_name = clean_search_name.strip()
            
            if len(clean_search_name) >= 3:
                _logger.info("PHARMACY RPC: Performing fuzzy search for '%s'", clean_search_name)
                fuzzy_products = self.env['product.product'].sudo().search([
                    ('name', 'ilike', clean_search_name)
                ]) # REMOVED LIMIT
                fuzzy_ids = fuzzy_products.ids
                _logger.info("PHARMACY RPC: Fuzzy search found %s variants", len(fuzzy_ids))
                
            all_ids = list(set(variant_ids + parent_ids + fuzzy_ids))
            _logger.info("PHARMACY RPC: Final search ID set: %s", all_ids)
            
            # 2. Load globally existing lots
            all_lots = self.env['stock.lot'].sudo().search([
                ('product_id', 'in', all_ids)
            ])
            _logger.info("PHARMACY RPC: Found %s lots total in database", len(all_lots))
            
            # --- DESPERATE SEARCH FALLBACK ---
            if not all_lots and len(clean_search_name) >= 4:
                _logger.info("PHARMACY RPC: Desperate search for lots matching '%s'", clean_search_name)
                # Find ANY lots where the product name matches our fuzzy search
                desperate_lots = self.env['stock.lot'].sudo().search([
                    ('product_id.name', 'ilike', clean_search_name)
                ], limit=50)
                if desperate_lots:
                    all_lots = desperate_lots
                    _logger.info("PHARMACY RPC: Desperate search found %s lots", len(all_lots))
                    # Update all_ids to include these new product sources so quants work
                    all_ids = list(set(all_ids + all_lots.mapped('product_id').ids))
            
            # 3. Load quantities (scoped to POS location)
            pos_config = self.env['pos.config'].sudo().browse(config_id)
            src_loc = pos_config.picking_type_id.default_location_src_id
            
            quants = self.env['stock.quant'].sudo().search([
                ('product_id', 'in', all_ids),
                ('lot_id', '!=', False),
                ('location_id', 'child_of', src_loc.id)
            ])
            
            stock_map = {} # name -> {child: 0, parent: 0}
            for q in quants:
                ln = q.lot_id.name
                if ln not in stock_map: stock_map[ln] = {'child': 0, 'parent': 0}
                if q.product_id.id in variant_ids:
                    stock_map[ln]['child'] += q.quantity
                else:
                    stock_map[ln]['parent'] += q.quantity

            # 4. Final Processing (Unified entries with precise variant targeting)
            final_results = []
            
            # Identify the specific variant we need a lot for
            target_product = product # product_id variant passed from POS
            
            # Group lot metadata by name (to return one entry per name)
            # Use the first encountered lot record for its metadata (like expiration)
            name_to_lot_meta = {}
            for lot in all_lots:
                if not lot.name or lot.name in name_to_lot_meta: continue
                name_to_lot_meta[lot.name] = lot

            for name in sorted(stock_map.keys()):
                meta_lot = name_to_lot_meta.get(name)
                # If we don't have a record for this name, use a dummy or create as needed
                exp = meta_lot.expiration_date if meta_lot else False
                exp_str = exp.strftime('%Y-%m-%d %H:%M:%S') if exp else False
                
                # --- PRECISION TARGETING ---
                # Find or create a lot for the SPECIFIC variant being sold in POS
                target_lot = self.env['stock.lot'].sudo().search([
                    ('product_id', '=', target_product.id),
                    ('name', '=', name),
                    ('company_id', '=', self.env.company.id)
                ], limit=1)
                
                if not target_lot:
                    _logger.info("PHARMACY RPC: Creating targeting lot '%s' for variant %s", name, target_product.id)
                    target_lot = self.env['stock.lot'].sudo().create({
                        'name': name,
                        'product_id': target_product.id,
                        'expiration_date': exp,
                        'company_id': self.env.company.id
                    })
                
                final_results.append({
                    'id': target_lot.id,
                    'name': name,
                    'display_name': name, # Clean UI: one line per lot
                    'product_qty': stock_map[name]['child'],
                    'parent_qty': stock_map[name]['parent'],
                    'expiration_date': exp_str,
                })
            
            # Handle lots with 0 stock that were found in the database but not in quants
            for name, meta_lot in name_to_lot_meta.items():
                if name not in stock_map:
                    # Precision sync for empty lots too
                    target_lot = self.env['stock.lot'].sudo().search([
                        ('product_id', '=', target_product.id),
                        ('name', '=', name)
                    ], limit=1)
                    if not target_lot:
                        target_lot = self.env['stock.lot'].sudo().create({
                            'name': name,
                            'product_id': target_product.id,
                            'expiration_date': meta_lot.expiration_date,
                            'company_id': self.env.company.id
                        })
                        
                    final_results.append({
                        'id': target_lot.id,
                        'name': name,
                        'display_name': name,
                        'product_qty': 0.0,
                        'parent_qty': 0.0,
                        'expiration_date': meta_lot.expiration_date.strftime('%Y-%m-%d %H:%M:%S') if meta_lot.expiration_date else False,
                    })
            
            _logger.info("PHARMACY RPC: Returning %s unified lot entries", len(final_results))
            return sorted(final_results, key=lambda x: x['name'])
            
        except Exception as e:
            _logger.error("PHARMACY RPC ERROR: %s", str(e), exc_info=True)
            return []

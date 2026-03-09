import datetime
import logging
from odoo import api, fields, models, _

_logger = logging.getLogger(__name__)

class PosOrderLine(models.Model):
    _inherit = 'pos.order.line'

    @api.model
    def get_existing_lots(self, company_id, config_id, product_id):
        """
        Ultimate Robust Version: Finds all lots for current product, variants, parent, 
        and name-matched products. Ensures visibility even if stock is 0.
        """
        try:
            _logger.info("PHARMACY RPC CALLED: product_id=%s", product_id)
            product = self.env['product.product'].sudo().browse(product_id)
            if not product.exists(): return []
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
            
            # Fuzzy match for products with similar names (Panadol, etc.)
            fuzzy_ids = []
            base_name = product.name.split('(')[0].strip()
            if len(base_name) > 3:
                fuzzy_products = self.env['product.product'].sudo().search([
                    ('name', 'ilike', base_name)
                ], limit=50)
                fuzzy_ids = fuzzy_products.ids
                
            all_ids = list(set(variant_ids + parent_ids + fuzzy_ids))
            
            # 2. Load globally existing lots (No limit for maximum visibility)
            all_lots = self.env['stock.lot'].sudo().search([
                ('product_id', 'in', all_ids)
            ])
            
            # 3. Load quantities (scoped to POS location)
            pos_config = self.env['pos.config'].sudo().browse(config_id)
            src_loc = pos_config.picking_type_id.default_location_src_id
            
            quants = self.env['stock.quant'].sudo().search([
                ('product_id', 'in', all_ids),
                ('quantity', '>', 0),
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

            # 4. Final Processing (Distinct entries for Envelope and Box)
            final_results = []
            seen_combinations = set() # (name, is_box)

            # Sort lots to ensure consistency
            sorted_lots = sorted(all_lots, key=lambda l: (l.name or '', l.product_id.id))

            for lot in sorted_lots:
                name = lot.name
                if not name: continue
                
                is_box = lot.product_id.id not in variant_ids
                comb = (name, is_box)
                if comb in seen_combinations: continue
                seen_combinations.add(comb)
                
                # Metadata
                exp = lot.expiration_date
                exp_str = exp.strftime('%Y-%m-%d %H:%M:%S') if exp else False
                
                # Ensure we have a "Selectable" ID for THIS product
                # (Always return a lot ID valid for the current order line product)
                target_id = lot.id
                if is_box:
                    local_lot = self.env['stock.lot'].sudo().search([
                        ('product_id', 'in', variant_ids),
                        ('name', '=', name)
                    ], limit=1)
                    if not local_lot:
                        v_id = product_id if product_id in variant_ids else variant_ids[0]
                        local_lot = self.env['stock.lot'].sudo().create({
                            'name': name,
                            'product_id': v_id,
                            'expiration_date': exp,
                            'company_id': lot.company_id.id or self.env.company.id
                        })
                    target_id = local_lot.id
                
                # Format Name for POS list
                suffix = " (Box)" if is_box else " (Envelope)"
                display_name = f"{name}{suffix}"
                
                final_results.append({
                    'id': target_id,
                    'name': name,
                    'display_name': display_name,
                    'product_qty': stock_map.get(name, {}).get('child', 0.0) if not is_box else 0.0,
                    'parent_qty': stock_map.get(name, {}).get('parent', 0.0) if is_box else 0.0,
                    'expiration_date': exp_str,
                })
            
            return sorted(final_results, key=lambda x: x['name'])
        except Exception as e:
            _logger.error("POS LOT ERROR: %s", str(e), exc_info=True)
            return []

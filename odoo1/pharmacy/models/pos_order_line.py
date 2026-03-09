import datetime
import logging
from odoo import api, fields, models, _

_logger = logging.getLogger(__name__)

class PosOrderLine(models.Model):
    _inherit = 'pos.order.line'

    @api.model
    def get_existing_lots(self, company_id, config_id, product_id):
        """
        Overridden to include expiration_date in the returned lots.
        """
        # Call the original method to get the base results
        # We can't easily call super() on @api.model methods in a way that is clean for inheritance sometimes,
        # but here we can just replicate the logic or call it if we find where it is.
        # It's defined in point_of_sale.models.pos_order.PosOrderLine

        # Actually, let's just use the logic from the original but add our field.
        pos_config = self.env['pos.config'].sudo().browse(config_id)
        # 1. Identify product IDs to check (product itself + parent box if any)
        product = self.env['product.product'].sudo().browse(product_id)
        product_ids_to_check = [product_id]
        
        # Robust Parent Box Identification
        parent_tmpl = product.parent_box_id or product.product_tmpl_id.parent_box_id
        
        if not parent_tmpl:
            # 1. Reverse lookup: Who points to us as their child?
            parent_tmpl = self.env['product.template'].sudo().search([
                ('envelope_child_id', 'in', [product.product_tmpl_id.id, product.id])
            ], limit=1)
            
        if not parent_tmpl:
            # 2. Name-based fallback (more flexible)
            # Try to find a product that has the same name but might have "box" or no suffix
            clean_name = product.name.lower().replace(' envelope', '').replace(' child', '').replace(' piece', '').strip()
            parent_tmpl = self.env['product.template'].sudo().search([
                ('name', 'ilike', clean_name),
                ('is_box_product', '=', True)
            ], limit=1)
            
        if parent_tmpl:
            # --- CRITICAL: Check ALL variants of the parent template ---
            parent_variants = self.env['product.product'].sudo().search([('product_tmpl_id', '=', parent_tmpl.id)])
            product_ids_to_check.extend(parent_variants.ids)
            _logger.info("PHARMACY: Linked child %s to parent box %s", product_id, parent_tmpl.id)

        # 2. Get quantities from stock.quant, aggregated by lot name
        src_loc = pos_config.picking_type_id.default_location_src_id
        quant_domain = [
            '|', ('company_id', '=', False), ('company_id', '=', company_id),
            ('product_id', 'in', product_ids_to_check),
            ('location_id', 'child_of', src_loc.id),
            ('quantity', '>', 0),
            ('lot_id', '!=', False),
        ]
        
        # We need to map child stock specifically for display
        # We aggregate by lot name to handle box/envelope dual lots
        # stock_map tracks stock for the SPECIFIC product_id requested in POS
        # aggregated by lot name
        name_stock_map = {}
        lot_id_map = {}
        lot_expiry_map = {}
        
        quants = self.env['stock.quant'].sudo().search(quant_domain)
        for q in quants:
            lot = q.lot_id
            name = lot.name
            
            # Record metadata for this name (preferring the child product's lot if already exists)
            if name not in lot_id_map or q.product_id.id == product_id:
                lot_id_map[name] = lot.id
                lot_expiry_map[name] = lot.expiration_date

            # Calculate stock ONLY if it's the child product AND in the exact search location
            if q.product_id.id == product_id and q.location_id.id == src_loc.id:
                name_stock_map[name] = name_stock_map.get(name, 0.0) + q.quantity

        # 3. Get ALL potential lots for these products to ensure visibility of un-opened lots
        lot_domain = [
            '|', ('company_id', '=', False), ('company_id', '=', company_id),
            ('product_id', 'in', product_ids_to_check),
        ]
        all_lots = self.env['stock.lot'].sudo().search(lot_domain)
        
        result = []
        seen_names = set()
        
        # Merge all found lot names
        for lot in all_lots:
            if lot.name in seen_names:
                continue
            seen_names.add(lot.name)
            
            name = lot.name
            qty = name_stock_map.get(name, 0.0)
            
            # Use the lot ID from quants if available, otherwise this lot
            lid = lot_id_map.get(name)
            exp = lot_expiry_map.get(name, lot.expiration_date)
            
            # --- CRITICAL FIX: Ensure the ID belongs to the CHILD product ---
            # If we only have a box lot ID (or no ID in the map yet), 
            # we MUST ensure there's a child lot record for the selection to be valid in POS.
            if not lid or self.env['stock.lot'].sudo().browse(lid).product_id.id != product_id:
                # Try to find a child lot by name
                child_lot = self.env['stock.lot'].sudo().search([
                    ('product_id', '=', product_id),
                    ('name', '=', name),
                    ('company_id', '=', company_id)
                ], limit=1)
                
                if not child_lot:
                    # Auto-create child lot so we have a valid ID for POS
                    child_lot = self.env['stock.lot'].sudo().create({
                        'name': name,
                        'product_id': product_id,
                        'company_id': company_id,
                        'expiration_date': exp,
                        'parent_lot_id': lot.id if lot.product_id.id != product_id else False,
                    })
                lid = child_lot.id
            
            exp_str = exp.strftime('%Y-%m-%d %H:%M:%S') if exp else False
            
            result.append({
                'id': lid,
                'name': name,
                'product_qty': qty,
                'expiration_date': exp_str,
            })

        # Final Sort: Alphabetical so related lots are grouped (ar0001, ar0002...)
        result.sort(key=lambda x: x['name'])
        return result

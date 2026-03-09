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
        # Always check ALL variants of the current product
        product_ids_to_check = product.product_tmpl_id.product_variant_ids.ids
        parent_product_ids = []
        
        # Robust Parent Box Identification
        parent_tmpl = product.parent_box_id or product.product_tmpl_id.parent_box_id
        
        if not parent_tmpl:
            # 1. Reverse lookup: Who points to us as their child?
            parent_tmpl = self.env['product.template'].sudo().search([
                ('envelope_child_id', 'in', [product.product_tmpl_id.id, product.id])
            ], limit=1)
            
        if not parent_tmpl:
            # 2. Name-based fallback (more flexible)
            clean_name = product.name.lower().replace(' envelope', '').replace(' child', '').replace(' piece', '').strip()
            parent_tmpl = self.env['product.template'].sudo().search([
                ('name', 'ilike', clean_name),
                ('is_box_product', '=', True)
            ], limit=1)
            
        if parent_tmpl:
            # Include ALL variants of the parent product
            parent_product_ids = parent_tmpl.product_variant_ids.ids
            _logger.info("PHARMACY: Linked child variants %s to parent box variants %s", product_ids_to_check, parent_product_ids)

        # 2. Get quantities from stock.quant, aggregated by lot name
        src_loc = pos_config.picking_type_id.default_location_src_id
        all_relevant_product_ids = list(set(product_ids_to_check + parent_product_ids))
        
        quant_domain = [
            '|', ('company_id', '=', False), ('company_id', '=', company_id),
            ('product_id', 'in', all_relevant_product_ids),
            ('location_id', 'child_of', src_loc.id),
            ('quantity', '>', 0),
            ('lot_id', '!=', False),
        ]
        
        # Track stock for Child and Parent separately per lot name
        name_child_stock = {}
        name_parent_stock = {}
        lot_id_map = {}
        lot_expiry_map = {}
        
        quants = self.env['stock.quant'].sudo().search(quant_domain)
        for q in quants:
            lot = q.lot_id
            name = lot.name
            
            # Record metadata (preferring current product's lot if multiple exist with same name)
            if name not in lot_id_map or q.product_id.id in product_ids_to_check:
                lot_id_map[name] = lot.id
                lot_expiry_map[name] = lot.expiration_date

            # Aggregate stock
            if q.product_id.id in product_ids_to_check:
                name_child_stock[name] = name_child_stock.get(name, 0.0) + q.quantity
            elif q.product_id.id in parent_product_ids:
                name_parent_stock[name] = name_parent_stock.get(name, 0.0) + q.quantity

        # 3. Get ALL potential lots to ensure visibility
        lot_domain = [
            '|', ('company_id', '=', False), ('company_id', '=', company_id),
            ('product_id', 'in', all_relevant_product_ids),
        ]
        all_lots = self.env['stock.lot'].sudo().search(lot_domain)
        
        result = []
        seen_names = set()
        
        for lot in all_lots:
            if lot.name in seen_names:
                continue
            seen_names.add(lot.name)
            
            name = lot.name
            child_qty = name_child_stock.get(name, 0.0)
            parent_qty = name_parent_stock.get(name, 0.0)
            
            lid = lot_id_map.get(name)
            exp = lot_expiry_map.get(name, lot.expiration_date)
            
            # Ensure the ID belongs to the product currently being sold (so it can be selected)
            if not lid or self.env['stock.lot'].sudo().browse(lid).product_id.id not in product_ids_to_check:
                child_lot = self.env['stock.lot'].sudo().search([
                    ('product_id', 'in', product_ids_to_check),
                    ('name', '=', name),
                    ('company_id', '=', company_id)
                ], limit=1)
                
                if not child_lot:
                    child_lot = self.env['stock.lot'].sudo().create({
                        'name': name,
                        'product_id': product_id, # Link to the specific variant being sold
                        'company_id': company_id,
                        'expiration_date': exp,
                        'parent_lot_id': lot.id if lot.product_id.id not in product_ids_to_check else False,
                    })
                lid = child_lot.id
            
            exp_str = exp.strftime('%Y-%m-%d %H:%M:%S') if exp else False
            
            result.append({
                'id': lid,
                'name': name,
                'product_qty': child_qty,
                'parent_qty': parent_qty,
                'expiration_date': exp_str,
            })

        result.sort(key=lambda x: x['name'])
        return result

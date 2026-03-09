import datetime
import logging
from odoo import api, fields, models, _

_logger = logging.getLogger(__name__)

class PosOrderLine(models.Model):
    _inherit = 'pos.order.line'

    @api.model
    def get_existing_lots(self, company_id, config_id, product_id):
        """
        Final robust version: Multi-variant search + Desperate Search fallback + Anti-crash.
        """
        try:
            _logger.info("PHARMACY RPC: get_existing_lots(product_id=%s, company_id=%s)", product_id, company_id)
            
            pos_config = self.env['pos.config'].sudo().browse(config_id)
            product = self.env['product.product'].sudo().browse(product_id)
            
            if not product.exists():
                return []

            # 1. Base IDs
            product_ids_to_check = product.product_tmpl_id.product_variant_ids.ids or [product_id]
            parent_product_ids = []
            
            # Parent Box Discovery
            parent_tmpl = product.parent_box_id or product.product_tmpl_id.parent_box_id
            if not parent_tmpl:
                parent_tmpl = self.env['product.template'].sudo().search([
                    ('envelope_child_id', 'in', [product.product_tmpl_id.id, product.id])
                ], limit=1)
                
            if not parent_tmpl:
                name_parts = product.name.lower().split()
                for i in range(len(name_parts), 0, -1):
                    clean_name = " ".join(name_parts[:i]).strip()
                    if clean_name in ('envelope', 'child', 'piece', 'test', 'needle') or len(clean_name) < 3:
                        continue
                    parent_tmpl = self.env['product.template'].sudo().search([
                        ('name', 'ilike', clean_name),
                        ('is_box_product', '=', True),
                        '|', ('company_id', '=', False), ('company_id', '=', company_id)
                    ], limit=1)
                    if parent_tmpl: break
                
            if parent_tmpl:
                parent_product_ids = parent_tmpl.product_variant_ids.ids

            # 2. Get quantities
            src_loc = pos_config.picking_type_id.default_location_src_id
            all_relevant_product_ids = list(set(product_ids_to_check + parent_product_ids))
            
            quant_domain = [
                '|', ('company_id', '=', False), ('company_id', '=', company_id),
                ('product_id', 'in', all_relevant_product_ids),
                ('location_id', 'child_of', src_loc.id),
                ('quantity', '>', 0),
                ('lot_id', '!=', False),
            ]
            
            name_child_stock = {}
            name_parent_stock = {}
            lot_id_map = {}
            lot_expiry_map = {}
            
            quants = self.env['stock.quant'].sudo().search(quant_domain)
            for q in quants:
                lot = q.lot_id
                name = lot.name
                if not name: continue
                
                if name not in lot_id_map or q.product_id.id in product_ids_to_check:
                    lot_id_map[name] = lot.id
                    lot_expiry_map[name] = lot.expiration_date

                if q.product_id.id in product_ids_to_check:
                    name_child_stock[name] = name_child_stock.get(name, 0.0) + q.quantity
                elif q.product_id.id in parent_product_ids:
                    name_parent_stock[name] = name_parent_stock.get(name, 0.0) + q.quantity

            # 3. Get ALL lots for visibility
            lot_domain = [
                '|', ('company_id', '=', False), ('company_id', '=', company_id),
                ('product_id', 'in', all_relevant_product_ids),
            ]
            all_lots = self.env['stock.lot'].sudo().search(lot_domain)
            
            # --- DESPERATE SEARCH: Fallback if no lots found via links ---
            if not all_lots:
                desperate_clean_name = product.name.lower().replace('envelope', '').replace('box', '').replace('test', '').strip()
                if len(desperate_clean_name) >= 4:
                    desperate_products = self.env['product.product'].sudo().search([
                        ('name', 'ilike', desperate_clean_name),
                        '|', ('company_id', '=', False), ('company_id', '=', company_id)
                    ], limit=10)
                    if desperate_products:
                        all_lots = self.env['stock.lot'].sudo().search([
                            ('product_id', 'in', desperate_products.ids),
                            '|', ('company_id', '=', False), ('company_id', '=', company_id)
                        ], limit=50)
                
                if not all_lots and product.code:
                    all_lots = self.env['stock.lot'].sudo().search([
                        ('product_id.code', '=', product.code),
                        '|', ('company_id', '=', False), ('company_id', '=', company_id)
                    ], limit=50)

            result = []
            seen_names = set()
            
            for lot in all_lots:
                name = lot.name
                if not name or name in seen_names: continue
                seen_names.add(name)
                
                child_qty = name_child_stock.get(name, 0.0)
                parent_qty = name_parent_stock.get(name, 0.0)
                
                lid = lot_id_map.get(name)
                exp = lot_expiry_map.get(name, lot.expiration_date)
                
                # Check IDs
                current_lot = self.env['stock.lot'].sudo().browse(lid) if lid else False
                if not lid or not current_lot.exists() or current_lot.product_id.id not in product_ids_to_check:
                    child_lot = self.env['stock.lot'].sudo().search([
                        ('product_id', 'in', product_ids_to_check),
                        ('name', '=', name),
                        ('company_id', '=', company_id)
                    ], limit=1)
                    
                    if not child_lot:
                        target_variant_id = product_id if product_id in product_ids_to_check else product_ids_to_check[0]
                        child_lot = self.env['stock.lot'].sudo().create({
                            'name': name,
                            'product_id': target_variant_id,
                            'company_id': company_id,
                            'expiration_date': exp,
                            'parent_lot_id': lot.id if lot.product_id.id not in product_ids_to_check else False,
                        })
                    lid = child_lot.id
                    exp = child_lot.expiration_date
                
                exp_str = False
                if exp:
                    try: exp_str = exp.strftime('%Y-%m-%d %H:%M:%S')
                    except: exp_str = str(exp).split('.')[0]

                result.append({
                    'id': lid,
                    'name': name,
                    'product_qty': child_qty,
                    'parent_qty': parent_qty,
                    'expiration_date': exp_str,
                })

            result.sort(key=lambda x: x['name'])
            return result
            
        except Exception as e:
            _logger.error("PHARMACY CRITICAL ERROR: %s", str(e), exc_info=True)
            return []

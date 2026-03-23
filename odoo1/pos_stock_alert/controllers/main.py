from odoo import http
from odoo.http import request
import logging

_logger = logging.getLogger(__name__)


class PosStockAlertController(http.Controller):
    @http.route('/pos_stock_alert/get_stock', type='json', auth='user')
    def get_stock(self, product_id):
        PP = request.env['product.product'].sudo()
        PT = request.env['product.template'].sudo()

        # Try to find a POS session for context
        context = {}
        session = request.env['pos.session'].sudo().search([
            ('user_id', '=', request.uid),
            ('state', '=', 'opened')
        ], limit=1, order='id desc')
        
        if not session:
            # Fallback: search for ANY open session in the same company
            session = request.env['pos.session'].sudo().search([
                ('state', '=', 'opened')
            ], limit=1, order='id desc')

        if session:
            loc_id = session.config_id.picking_type_id.default_location_src_id.id
            if loc_id:
                context['location'] = loc_id

        # Try as product.product
        product = PP.with_context(**context).browse(product_id)
        if product.exists():
            # In Odoo 17/18/20, 'consu' (Goods) or 'product' are tangible.
            # Services typically have qty_available=0 anyway.
            is_storable = product.type in ('product', 'consu')
            
            qty = product.qty_available
            # Fallback to global if location-specific is 0 but we see global stock
            if qty <= 0:
                global_qty = product.with_context(location=None).qty_available
                if global_qty > 0:
                    _logger.info("[POS Stock Alert] Falling back to global qty for %s: %s (loc was 0)", product.display_name, global_qty)
                    qty = global_qty

            warn = product.x_qty_to_warn
            debug = 'product.product id=%s name=%s type=%s qty=%s (loc=%s) warn=%s' % (
                product.id, product.display_name, product.type, qty, context.get('location'), warn)
            _logger.info("[POS Stock Alert] %s", debug)
            return {
                'success': True,
                'is_storable': is_storable,
                'qty_available': qty,
                'x_qty_to_warn': warn,
                'debug': debug,
            }

        # Maybe template
        template = PT.with_context(**context).browse(product_id)
        if template.exists():
            is_storable = template.type in ('product', 'consu')
            qty = template.qty_available
            if qty <= 0:
                global_qty = template.with_context(location=None).qty_available
                if global_qty > 0:
                    qty = global_qty

            warn = template.x_qty_to_warn
            debug = 'product.template id=%s name=%s type=%s qty=%s (loc=%s) warn=%s' % (
                template.id, template.display_name, template.type, qty, context.get('location'), warn)
            _logger.info("[POS Stock Alert] %s", debug)
            return {
                'success': True,
                'is_storable': is_storable,
                'qty_available': qty,
                'x_qty_to_warn': warn,
                'debug': debug,
            }

        debug = 'NOT FOUND id=%s' % product_id
        _logger.warning("[POS Stock Alert] %s", debug)
        return {'success': False, 'qty_available': 0, 'x_qty_to_warn': 0, 'debug': debug}

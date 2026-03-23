from odoo import http
from odoo.http import request
import logging

_logger = logging.getLogger(__name__)

class PosStockAlertController(http.Controller):
    @http.route('/pos_stock_alert/get_stock', type='json', auth='user')
    def get_stock(self, product_id):
        PP = request.env['product.product'].sudo()
        PT = request.env['product.template'].sudo()

        _logger.info("[POS Stock Alert] get_stock for id=%s", product_id)

        # Try to find a POS session for context
        context = {}
        session = request.env['pos.session'].sudo().search([
            ('user_id', '=', request.uid),
            ('state', '=', 'opened')
        ], limit=1, order='id desc')
        
        if not session:
            session = request.env['pos.session'].sudo().search([
                ('state', '=', 'opened')
            ], limit=1, order='id desc')

        if session:
            loc_id = session.config_id.picking_type_id.default_location_src_id.id
            if loc_id:
                context['location'] = loc_id

        # Try as product.product
        product = PP.with_context(**context).browse(product_id)
        if product.exists() and product._name == 'product.product':
            is_storable = product.detailed_type == 'product'
            qty = product.qty_available
            if qty <= 0:
                global_qty = product.with_context(location=None).qty_available
                if global_qty > 0:
                    qty = global_qty
            warn = product.x_qty_to_warn
            return {
                'success': True,
                'is_storable': is_storable,
                'qty_available': qty,
                'x_qty_to_warn': warn,
            }

        # Try as product.template
        template = PT.with_context(**context).browse(product_id)
        if template.exists():
            is_storable = template.detailed_type == 'product'
            qty = template.qty_available
            if qty <= 0:
                global_qty = template.with_context(location=None).qty_available
                if global_qty > 0:
                    qty = global_qty
            warn = template.x_qty_to_warn
            return {
                'success': True,
                'is_storable': is_storable,
                'qty_available': qty,
                'x_qty_to_warn': warn,
            }

        return {'success': False, 'qty_available': 0, 'x_qty_to_warn': 0}

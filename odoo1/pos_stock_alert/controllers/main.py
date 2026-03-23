from odoo import http
from odoo.http import request
import logging

_logger = logging.getLogger(__name__)


class PosStockAlertController(http.Controller):
    @http.route('/pos_stock_alert/get_stock', type='json', auth='user')
    def get_stock(self, product_id):
        PP = request.env['product.product']
        PT = request.env['product.template']

        # Auto-detect POS session location
        context = {}
        session = request.env['pos.session'].sudo().search([
            ('user_id', '=', request.uid),
            ('state', '=', 'opened')
        ], limit=1, order='id desc')
        if session:
            loc_id = session.config_id.picking_type_id.default_location_src_id.id
            if loc_id:
                context['location'] = loc_id

        # Try as product.product first
        product = PP.with_context(**context).browse(product_id)
        if product.exists() and product._name == 'product.product':
            qty = product.qty_available
            warn = product.x_qty_to_warn
            debug = 'product.product id=%s name=%s qty=%s warn=%s loc=%s' % (
                product.id, product.display_name, qty, warn, context.get('location'))
            _logger.info("[POS Stock Alert] %s", debug)
            return {
                'qty_available': qty,
                'x_qty_to_warn': warn,
                'debug': debug,
            }

        # Maybe the POS sent a product.template ID
        template = PT.with_context(**context).browse(product_id)
        if template.exists():
            qty = template.qty_available
            warn = template.x_qty_to_warn
            debug = 'product.template id=%s name=%s qty=%s warn=%s loc=%s' % (
                template.id, template.display_name, qty, warn, context.get('location'))
            _logger.info("[POS Stock Alert] %s", debug)
            return {
                'qty_available': qty,
                'x_qty_to_warn': warn,
                'debug': debug,
            }

        debug = 'NOT FOUND id=%s' % product_id
        _logger.warning("[POS Stock Alert] %s", debug)
        return {'qty_available': 0, 'x_qty_to_warn': 0, 'debug': debug}

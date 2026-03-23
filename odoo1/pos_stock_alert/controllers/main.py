from odoo import http
from odoo.http import request
import logging

_logger = logging.getLogger(__name__)


class PosStockAlertController(http.Controller):
    @http.route('/pos_stock_alert/get_stock', type='json', auth='user')
    def get_stock(self, product_id):
        PP = request.env['product.product']
        PT = request.env['product.template']

        # Try as product.product first
        product = PP.browse(product_id)
        if product.exists():
            qty = product.qty_available
            warn = product.x_qty_to_warn
            debug = 'product.product id=%s name=%s qty=%s warn=%s' % (
                product.id, product.display_name, qty, warn)
            _logger.info("[POS Stock Alert] %s", debug)
            return {
                'qty_available': qty,
                'x_qty_to_warn': warn,
                'debug': debug,
            }

        # Maybe the POS sent a product.template ID
        template = PT.browse(product_id)
        if template.exists():
            qty = template.qty_available
            warn = template.x_qty_to_warn
            debug = 'product.template id=%s name=%s qty=%s warn=%s' % (
                template.id, template.display_name, qty, warn)
            _logger.info("[POS Stock Alert] %s", debug)
            return {
                'qty_available': qty,
                'x_qty_to_warn': warn,
                'debug': debug,
            }

        debug = 'NOT FOUND id=%s' % product_id
        _logger.warning("[POS Stock Alert] %s", debug)
        return {'qty_available': 0, 'x_qty_to_warn': 0, 'debug': debug}

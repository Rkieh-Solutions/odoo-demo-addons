from odoo import http
from odoo.http import request


class PosStockAlertController(http.Controller):
    @http.route('/pos_stock_alert/get_stock', type='json', auth='user')
    def get_stock(self, product_id):
        product = request.env['product.product'].browse(product_id)
        return {
            'qty_available': product.qty_available,
            'x_qty_to_warn': product.x_qty_to_warn,
        }

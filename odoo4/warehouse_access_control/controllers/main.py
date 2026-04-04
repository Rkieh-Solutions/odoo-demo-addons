import json
from odoo import http
from odoo.http import request


class WarehouseStockAlertController(http.Controller):

    @http.route('/warehouse_access_control/get_stock', type='json', auth='user')
    def get_stock(self, product_id=None, model='product.product', **kw):
        if not product_id:
            return {'qty_available': 0}

        if model == 'product.template':
            product = request.env['product.template'].sudo().browse(int(product_id))
            qty = product.qty_available if product.exists() else 0
        else:
            product = request.env['product.product'].sudo().browse(int(product_id))
            qty = product.qty_available if product.exists() else 0

        return {
            'qty_available': qty,
        }

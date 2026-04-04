from odoo import http
from odoo.http import request
import logging

_logger = logging.getLogger(__name__)


class PosStockAlertController(http.Controller):
    @http.route('/warehouse_access_control/get_stock', type='jsonrpc', auth='user')
    def get_stock(self, product_id, config_id=None, model=None, product_name=None):
        PP = request.env['product.product'].sudo()
        PT = request.env['product.template'].sudo()

        _logger.info("[POS Stock Alert] INVOKED: id=%s name=%s model=%s config=%s", product_id, product_name, model, config_id)

        # Convert to int if needed
        try:
            pid = int(product_id)
        except:
            pid = product_id

        if config_id:
            config = request.env['pos.config'].sudo().browse(config_id)
            if config.exists():
                location = config.picking_type_id.default_location_src_id
                if location:
                    PP = PP.with_context(location=location.id)
                    PT = PT.with_context(location=location.id)
                if config.picking_type_id.warehouse_id:
                    PP = PP.with_context(warehouse=config.picking_type_id.warehouse_id.id)
                    PT = PT.with_context(warehouse=config.picking_type_id.warehouse_id.id)

        # 1. Try the requested model first
        record = None
        if model == 'product.template':
            candidate = PT.browse(pid)
            if candidate.exists() and (not product_name or candidate.display_name == product_name):
                record = candidate
        elif model == 'product.product':
            candidate = PP.browse(pid)
            if candidate.exists() and (not product_name or candidate.display_name == product_name or candidate.name == product_name):
                record = candidate
        
        # 2. If no match (or name mismatch), try the OTHER model
        if not record:
             other_pp = PT if model == 'product.product' or not model else PP
             candidate = other_pp.browse(pid)
             if candidate.exists():
                  # Only switch if name matches, to be safe
                  if not product_name or candidate.display_name == product_name or (hasattr(candidate, 'name') and candidate.name == product_name):
                       record = candidate
                       _logger.info("[POS Stock Alert] Model correction: using %s for ID %s because name matched.", record._name, pid)

        # 3. Final fallback: search by name only if ID matching failed completely
        if not record and product_name:
             found = PP.search([('display_name', '=', product_name)], limit=1)
             if found:
                  record = found
                  _logger.info("[POS Stock Alert] Found by name search: %s (id %s)", record.display_name, record.id)

        if record:
            qty = record.qty_available
            warn = getattr(record, 'x_qty_to_warn', 0.0)
            if not warn and hasattr(record, 'product_tmpl_id'):
                warn = record.product_tmpl_id.x_qty_to_warn
            
            if qty == 0:
                 qty_all = record.with_context(location=False, warehouse=False).qty_available
                 _logger.info("[POS Stock Alert] Stock is 0 in POS location, but %s total for %s.", qty_all, record.display_name)

            debug = '%s id=%s name=%s qty=%s warn=%s' % (
                record._name, record.id, record.display_name, qty, warn)
            _logger.info("[POS Stock Alert] %s", debug)
            return {
                'qty_available': qty,
                'x_qty_to_warn': warn,
                'debug': debug,
            }

        debug = 'NOT FOUND id=%s model=%s name=%s' % (product_id, model, product_name)
        _logger.warning("[POS Stock Alert] %s", debug)
        return {'qty_available': 0, 'x_qty_to_warn': 0, 'debug': debug}

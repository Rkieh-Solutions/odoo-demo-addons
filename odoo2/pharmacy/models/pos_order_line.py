from odoo import api, models, _

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
        pos_config = self.env['pos.config'].browse(config_id)
        if not pos_config:
            return []

        src_loc = pos_config.picking_type_id.default_location_src_id
        domain = [
            '|',
            ('company_id', '=', False),
            ('company_id', '=', company_id),
            ('product_id', '=', product_id),
            ('location_id', 'in', src_loc.child_internal_location_ids.ids),
            ('quantity', '>', 0),
            ('lot_id', '!=', False),
        ]

        groups = self.sudo().env['stock.quant']._read_group(
            domain=domain,
            groupby=['lot_id'],
            aggregates=['quantity:sum']
        )

        result = []
        for lot_recordset, total_quantity in groups:
            if lot_recordset:
                # lot_recordset is usually a solitary record because of groupby ['lot_id']
                lot = self.env['stock.lot'].sudo().browse(lot_recordset.id)
                
                # Convert datetime to string for reliable JSON-RPC transmission
                exp_date = lot.expiration_date
                exp_date_str = exp_date.strftime('%Y-%m-%d %H:%M:%S') if exp_date else False
                
                result.append({
                    'id': lot.id,
                    'name': lot.name,
                    'product_qty': total_quantity,
                    'expiration_date': exp_date_str,
                })

        return result

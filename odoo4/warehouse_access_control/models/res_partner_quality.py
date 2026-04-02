from odoo import models, fields, api

class ResPartnerQuality(models.Model):
    _inherit = 'res.partner'

    custom_accepted_qty = fields.Float(
        string='Accepted Quantity', 
        compute='_compute_vendor_quality_stats',
        store=False,
        help="Total incoming items accepted without failing a quality check."
    )
    custom_failed_qty = fields.Float(
        string='Failed Quantity', 
        compute='_compute_vendor_quality_stats',
        store=False,
        help="Total incoming items that failed a quality check."
    )
    custom_damage_rate = fields.Float(
        string='Damage Rate (%)', 
        compute='_compute_vendor_quality_stats',
        store=False
    )
    custom_vendor_rating = fields.Selection([
        ('excellent', 'Excellent'),
        ('good', 'Good'),
        ('average', 'Average'),
        ('poor', 'Poor')
    ], string='Vendor Rating', compute='_compute_vendor_quality_stats', store=False)

    def _compute_vendor_quality_stats(self):
        for partner in self:
            # Only calculate for actual vendors
            if not partner.supplier_rank and not partner.is_company:
                partner.custom_accepted_qty = 0.0
                partner.custom_failed_qty = 0.0
                partner.custom_damage_rate = 0.0
                partner.custom_vendor_rating = 'excellent'
                continue

            # Fetch all incoming transfers from this vendor that are DONE
            pickings = self.env['stock.picking'].search([
                ('partner_id', 'child_of', partner.id),
                ('picking_type_id.code', '=', 'incoming'),
                ('state', '=', 'done')
            ])

            total_received = sum(pickings.mapped('move_ids.quantity'))
            total_failed = 0.0

            # Loop through all quality checks attached to these deliveries
            quality_checks = self.env['quality.check'].search([
                ('picking_id', 'in', pickings.ids),
                ('quality_state', '=', 'fail')
            ])

            for check in quality_checks:
                # Odoo Studio places custom fields dynamically.
                # We try extracting the exact failed qty if the user typed it into a custom box.
                if hasattr(check, 'x_quantity_failed'):
                    total_failed += getattr(check, 'x_quantity_failed')
                elif hasattr(check, 'x_failed_qty'):
                    total_failed += getattr(check, 'x_failed_qty')
                elif hasattr(check, 'qty_line'):
                    total_failed += check.qty_line
                else:
                    total_failed += check.product_id.qty_available

            total_accepted = total_received - total_failed

            # Prevent negative math anomalies
            if total_accepted < 0:
                total_accepted = 0.0

            total_overall = total_accepted + total_failed
            rate = (total_failed / total_overall * 100.0) if total_overall > 0 else 0.0

            # Assign Rating Badge
            if rate <= 5.0:
                badge = 'excellent'
            elif rate <= 15.0:
                badge = 'good'
            elif rate <= 30.0:
                badge = 'average'
            else:
                badge = 'poor'

            partner.custom_accepted_qty = total_accepted
            partner.custom_failed_qty = total_failed
            partner.custom_damage_rate = rate
            partner.custom_vendor_rating = badge

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
            # Set absolute defaults to prevent UI crash on new/empty records
            total_accepted = 0.0
            total_failed = 0.0
            rate = 0.0
            badge = 'excellent'

            try:
                # Fetch all incoming transfers from this vendor that are DONE
                # Use sudo() to bypass potential permission locks on picking lookups
                pickings = self.env['stock.picking'].sudo().search([
                    ('partner_id', 'child_of', partner.id),
                    ('picking_type_id.code', '=', 'incoming'),
                    ('state', '=', 'done')
                ])

                if pickings:
                    # Defensive quantity extraction (handle Odoo 15/16/17 field names)
                    def extract_qty(m):
                        return getattr(m, 'quantity', getattr(m, 'quantity_done', getattr(m, 'product_uom_qty', 0.0)))

                    # Calculate total demand vs total received
                    total_demand = sum(m.product_uom_qty for m in pickings.move_ids)
                    total_received = sum(extract_qty(m) for m in pickings.move_ids)
                    
                    # Shortage (Demand - Done) is treated as Failed/Damaged by default
                    total_failed = total_demand - total_received
                    if total_failed < 0:
                        total_failed = 0.0
                    
                    # Loop through all quality checks attached to these deliveries
                    quality_checks = self.env['quality.check'].sudo().search([
                        ('picking_id', 'in', pickings.ids),
                        ('quality_state', '=', 'fail')
                    ])

                    for check in quality_checks:
                        # Extract exact failed qty if the user typed it into a custom box (Studio)
                        if hasattr(check, 'x_quantity_failed'):
                            total_failed += getattr(check, 'x_quantity_failed')
                        elif hasattr(check, 'x_failed_qty'):
                            total_failed += getattr(check, 'x_failed_qty')
                        elif hasattr(check, 'qty_line'):
                            total_failed += check.qty_line
                        else:
                            # Fallback: if check failed but no specific qty, assume the whole received line failed
                            pkg_move = pickings.move_ids.filtered(
                                lambda m: m.picking_id.id == check.picking_id.id and 
                                          m.product_id.id == check.product_id.id
                            )
                            total_failed += sum(extract_qty(m) for m in pkg_move)

                    # Total Accepted is what was demanded minus what failed/was missing
                    total_accepted = total_demand - total_failed
                    if total_accepted < 0:
                        total_accepted = 0.0

                    # Use total_demand as the base for the rate
                    total_overall = total_demand 
                    if total_overall > 0:
                        rate = (total_failed / total_overall * 100.0)

                    # Dynamic thresholds from Company Settings
                    company = self.env.company
                    exc = getattr(company, 'quality_excellent_limit', 5.0) or 5.0
                    god = getattr(company, 'quality_good_limit', 15.0) or 15.0
                    avg = getattr(company, 'quality_average_limit', 30.0) or 30.0

                    if rate <= exc:
                        badge = 'excellent'
                    elif rate <= god:
                        badge = 'good'
                    elif rate <= avg:
                        badge = 'average'
                    else:
                        badge = 'poor'
            except Exception:
                # If anything fails (missing fields during upgrade), keep defaults
                pass

            partner.custom_accepted_qty = total_accepted
            partner.custom_failed_qty = total_failed
            partner.custom_damage_rate = rate
            partner.custom_vendor_rating = badge

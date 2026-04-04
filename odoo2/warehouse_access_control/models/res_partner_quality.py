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
                        return getattr(m, 'quantity', getattr(m, 'quantity_done', 0.0))

                    # Calculate total demand vs total received
                    total_demand = sum(m.product_uom_qty for m in pickings.move_ids)
                    total_received = sum(extract_qty(m) for m in pickings.move_ids)
                    
                    # Shortage (Demand - Done) is treated as Failed/Damaged by default
                    shortage = total_demand - total_received
                    if shortage < 0:
                        shortage = 0.0
                    
                    total_failed_checks = 0.0
                    # Loop through all quality checks attached to these deliveries
                    quality_check_model = self.env.get('quality.check')
                    quality_checks = []
                    if quality_check_model:
                        quality_checks = quality_check_model.sudo().search([
                            ('picking_id', 'in', pickings.ids),
                            ('quality_state', '=', 'fail')
                        ])

                    for check in quality_checks:
                        # Try to link to a specific move if move_id exists on quality.check
                        check_qty = 0.0
                        if hasattr(check, 'x_quantity_failed'):
                            check_qty = getattr(check, 'x_quantity_failed')
                        elif hasattr(check, 'x_failed_qty'):
                            check_qty = getattr(check, 'x_failed_qty')
                        elif hasattr(check, 'qty_line'):
                            check_qty = check.qty_line
                        else:
                            # Fallback: find the specific move for this product in THIS picking
                            pkg_move = pickings.move_ids.filtered(
                                lambda m: m.picking_id.id == check.picking_id.id and 
                                          m.product_id.id == check.product_id.id
                            )
                            # Use only the first move if there are multiple to avoid double counting
                            # unless we can distinguish them. For now, this is a safer aggregate.
                            check_qty = extract_qty(pkg_move[0]) if pkg_move else 0.0
                        
                        total_failed_checks += check_qty

                    # Total Failed = Shortage + Failures among received items
                    total_failed = shortage + total_failed_checks
                    
                    # Total Accepted = What was actually received minus what failed quality checks
                    total_accepted = total_received - total_failed_checks
                    if total_accepted < 0:
                        total_accepted = 0.0

                    # Use total_demand as the base for the rate (matching user's 83% for 50/60)
                    total_overall = total_demand 
                    if total_overall > 0:
                        rate = (total_failed / total_overall * 100.0)
                    elif total_received > 0:
                        # If no demand but received items, use received as base
                        rate = (total_failed / total_received * 100.0)

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

from odoo import models, fields, api


class WarehouseDashboard(models.Model):
    """Dashboard KPI helper — one record per company."""
    _name = 'warehouse.dashboard'
    _description = 'Warehouse Dashboard'

    name = fields.Char(default='Dashboard')
    company_id = fields.Many2one('res.company', default=lambda self: self.env.company)

    # ── Picking KPIs ──────────────────────────────────────────
    orders_released = fields.Integer(compute='_compute_picking_kpis')
    orders_picking = fields.Integer(compute='_compute_picking_kpis')
    orders_pending_check = fields.Integer(compute='_compute_picking_kpis')
    orders_ready_dispatch = fields.Integer(compute='_compute_picking_kpis')
    orders_with_exceptions = fields.Integer(compute='_compute_picking_kpis')

    @api.depends_context('uid')
    def _compute_picking_kpis(self):
        Picking = self.env['stock.picking']
        for rec in self:
            rec.orders_released = Picking.search_count([('custom_status', '=', 'released')])
            rec.orders_picking = Picking.search_count([('custom_status', '=', 'picking_in_progress')])
            rec.orders_pending_check = Picking.search_count([('custom_status', '=', 'pending_checking')])
            rec.orders_ready_dispatch = Picking.search_count([('custom_status', '=', 'ready_dispatch')])
            rec.orders_with_exceptions = Picking.search_count([('exception_flag', '=', True)])

    # ── Quality KPIs ──────────────────────────────────────────
    # quality_checks_today = fields.Integer(compute='_compute_quality_kpis')
    # quality_pass_today = fields.Integer(compute='_compute_quality_kpis')
    # quality_fail_today = fields.Integer(compute='_compute_quality_kpis')
    # open_alerts = fields.Integer(compute='_compute_quality_kpis')
    # open_capa = fields.Integer(compute='_compute_quality_kpis')

    def _compute_quality_kpis(self):
        self.quality_checks_today = 0
        self.quality_pass_today = 0
        self.quality_fail_today = 0
        self.open_alerts = 0
        self.open_capa = 0

    # ── Inventory KPIs ────────────────────────────────────────
    low_stock_count = fields.Integer(compute='_compute_inventory_kpis')
    out_of_stock_count = fields.Integer(compute='_compute_inventory_kpis')
    total_products = fields.Integer(compute='_compute_inventory_kpis')

    @api.depends_context('uid')
    def _compute_inventory_kpis(self):
        Product = self.env['product.product']
        for rec in self:
            rec.total_products = Product.search_count([('type', '=', 'consu')])
            rec.out_of_stock_count = Product.search_count([
                ('type', '=', 'consu'), ('qty_available', '<=', 0)
            ])
            rec.low_stock_count = Product.search_count([
                ('type', '=', 'consu'), ('qty_available', '>', 0),
                ('qty_available', '<=', 10)
            ])

    # ── Manufacturing KPIs ────────────────────────────────────
    mo_confirmed = fields.Integer(compute='_compute_mrp_kpis')
    mo_in_progress = fields.Integer(compute='_compute_mrp_kpis')
    mo_late = fields.Integer(compute='_compute_mrp_kpis')
    # open_maintenance = fields.Integer(compute='_compute_mrp_kpis')

    def _compute_mrp_kpis(self):
        MO = self.env['mrp.production']
        for rec in self:
            rec.mo_confirmed = MO.search_count([('state', '=', 'confirmed')])
            rec.mo_in_progress = MO.search_count([('state', '=', 'progress')])
            rec.mo_late = MO.search_count([
                ('state', 'in', ['confirmed', 'progress']),
                ('date_deadline', '<', fields.Datetime.now()),
            ])
            # rec.open_maintenance = self.env['maintenance.request'].search_count([
            #     ('stage_id.done', '=', False)
            # ])

    @api.model
    def get_or_create_dashboard(self):
        dashboard = self.search([('company_id', '=', self.env.company.id)], limit=1)
        if not dashboard:
            dashboard = self.create({'company_id': self.env.company.id})
        return dashboard.id

from odoo import models, fields, api


class QualityCapa(models.Model):
    """Corrective and Preventive Action (CAPA)"""
    _name = 'quality.capa'
    _description = 'Quality CAPA'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'create_date desc'

    name = fields.Char(string='CAPA Reference', required=True, copy=False,
                       default=lambda self: self.env['ir.sequence'].next_by_code('quality.capa'))
    title = fields.Char(string='Title', required=True)
    alert_id = fields.Many2one('quality.alert', string='Related Alert')
    product_id = fields.Many2one('product.product', string='Product')
    lot_id = fields.Many2one('stock.lot', string='Lot / Serial')
    root_cause = fields.Text(string='Root Cause')
    corrective_action = fields.Text(string='Corrective Action')
    preventive_action = fields.Text(string='Preventive Action')
    responsible_id = fields.Many2one('res.users', string='Responsible',
                                     default=lambda self: self.env.uid)
    team_id = fields.Many2one('quality.alert.team', string='Quality Team')
    deadline = fields.Date(string='Deadline')
    status = fields.Selection([
        ('new', 'New'),
        ('in_progress', 'In Progress'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
    ], string='Status', default='new', required=True, tracking=True)
    priority = fields.Selection([
        ('0', 'Normal'),
        ('1', 'High'),
        ('2', 'Critical'),
    ], string='Priority', default='0')
    close_date = fields.Date(string='Closed On', readonly=True)
    notes = fields.Html(string='Notes')

    def action_in_progress(self):
        self.write({'status': 'in_progress'})

    def action_resolve(self):
        self.write({'status': 'resolved'})

    def action_close(self):
        self.write({
            'status': 'closed',
            'close_date': fields.Date.today(),
        })

    def action_reopen(self):
        self.write({'status': 'in_progress', 'close_date': False})


class QualityAlert(models.Model):
    _inherit = 'quality.alert'

    capa_ids = fields.One2many('quality.capa', 'alert_id', string='CAPA Actions')
    capa_count = fields.Integer(string='CAPA Count', compute='_compute_capa_count')

    @api.depends('capa_ids')
    def _compute_capa_count(self):
        for alert in self:
            alert.capa_count = len(alert.capa_ids)

    def action_create_capa(self):
        return {
            'type': 'ir.actions.act_window',
            'name': 'Create CAPA',
            'res_model': 'quality.capa',
            'view_mode': 'form',
            'target': 'new',
            'context': {
                'default_alert_id': self.id,
                'default_product_id': self.product_id.id,
                'default_lot_id': self.lot_id.id if self.lot_id else False,
            },
        }

    def action_view_capa(self):
        return {
            'type': 'ir.actions.act_window',
            'name': 'CAPA Actions',
            'res_model': 'quality.capa',
            'view_mode': 'list,form',
            'domain': [('alert_id', '=', self.id)],
        }

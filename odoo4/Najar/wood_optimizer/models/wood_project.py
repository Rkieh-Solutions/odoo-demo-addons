from odoo import models, fields, api

class WoodProject(models.Model):
    _name = 'wood.project'
    _description = 'Woodworking Project'
    _inherit = ['mail.thread', 'mail.activity.mixin']

    name = fields.Char(string='Project Name', required=True, tracking=True)
    wood_type = fields.Char(string='Wood Type', tracking=True)
    production_id = fields.Many2one('mrp.production', string='Manufacturing Order', tracking=True)
    student_id = fields.Many2one('school.student', string='Assigned Student', tracking=True)
    
    state = fields.Selection([
        ('draft', 'Draft'),
        ('confirmed', 'Confirmed'),
        ('progress', 'In Progress'),
        ('done', 'Finished'),
        ('cancel', 'Cancelled'),
    ], string='Status', default='draft', tracking=True)

    # Board Dimensions
    board_width = fields.Float(string='Board Width', default=244.0)
    board_height = fields.Float(string='Board Height', default=122.0)
    board_kerf = fields.Float(string='Kerf (cm)', default=0.3)
    board_unit = fields.Selection([
        ('cm', 'cm'),
        ('mm', 'mm'),
        ('in', 'in')
    ], string='Unit', default='cm')
    board_quantity = fields.Integer(string='Boards Needed', default=1)

    piece_ids = fields.One2many('wood.piece', 'project_id', string='Pieces')
    
    progress = fields.Float(string='Cutting Progress', compute='_compute_progress', store=True)

    @api.depends('piece_ids.completed')
    def _compute_progress(self):
        for project in self:
            if not project.piece_ids:
                project.progress = 0
            else:
                completed = len(project.piece_ids.filtered(lambda p: p.completed))
                project.progress = (completed / len(project.piece_ids)) * 100

    def action_open_optimizer(self):
        self.ensure_one()
        self.state = 'progress'
        return {
            'type': 'ir.actions.act_url',
            'url': '/wood_optimizer/ui/%s' % self.id,
            'target': 'new',
        }

    def action_pull_from_mo(self):
        self.ensure_one()
        if not self.production_id:
            return
        
        for move in self.production_id.move_raw_ids:
            self.env['wood.piece'].create({
                'project_id': self.id,
                'name': move.product_id.display_name,
                'width': 50.0,
                'height': 30.0,
                'quantity': int(move.product_uom_qty),
            })

class MrpProduction(models.Model):
    _inherit = 'mrp.production'

    def action_create_cutting_plan(self):
        self.ensure_one()
        project = self.env['wood.project'].create({
            'name': 'Plan for %s' % self.name,
            'production_id': self.id,
            'wood_type': 'MDF 18mm',
        })
        project.action_pull_from_mo()
        return {
            'type': 'ir.actions.act_window',
            'res_model': 'wood.project',
            'res_id': project.id,
            'view_mode': 'form',
            'target': 'current',
        }

class WoodPiece(models.Model):
    _name = 'wood.piece'
    _description = 'Woodworking Piece'

    project_id = fields.Many2one('wood.project', string='Project', ondelete='cascade')
    name = fields.Char(string='Piece Name', required=True)
    width = fields.Float(string='Width', required=True)
    height = fields.Float(string='Height', required=True)
    quantity = fields.Integer(string='Quantity', default=1)
    allow_rotation = fields.Boolean(string='Allow Rotation', default=True)
    completed = fields.Boolean(string='Completed', default=False)

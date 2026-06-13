from odoo import http
from odoo.http import request
import json

class WoodOptimizer(http.Controller):

    @http.route('/wood_optimizer/app', type='http', auth='user')
    def optimizer_app(self, **kwargs):
        """Native Odoo rendering using web.layout."""
        return request.render('wood_optimizer.optimizer_template', {
            'project_json': json.dumps({})
        })

    @http.route('/wood_optimizer/ui/<int:project_id>', type='http', auth='user')
    def optimizer_ui(self, project_id, **kwargs):
        """Open the optimizer with a specific wood project pre-loaded."""
        project = request.env['wood.project'].browse(project_id)
        if not project.exists():
            return "Project not found"

        pieces_data = []
        for p in project.piece_ids:
            pieces_data.append({
                'id': p.id,
                'name': p.name,
                'width': p.width,
                'height': p.height,
                'quantity': p.quantity,
                'allowRotation': p.allow_rotation,
                'completed': p.completed
            })

        project_data = {
            'id': project.id,
            'projectName': project.name,
            'board': {
                'name': project.wood_type or 'Default Board',
                'width': project.board_width,
                'height': project.board_height,
                'kerf': project.board_kerf,
                'unit': project.board_unit,
                'quantity': project.board_quantity
            },
            'pieces': pieces_data
        }

        return request.render('wood_optimizer.optimizer_template', {
            'project_json': json.dumps(project_data)
        })

    @http.route('/wood_optimizer/save', type='jsonrpc', auth='user', methods=['POST'])
    def save_project_data(self, project_id, pieces, **kwargs):
        project = request.env['wood.project'].browse(project_id)
        if not project.exists():
            return {'status': 'error', 'message': 'Project not found'}

        for p_data in pieces:
            p_id = p_data.get('id')
            if isinstance(p_id, int):
                piece = request.env['wood.piece'].browse(p_id)
                if piece.exists() and piece.project_id == project:
                    piece.write({
                        'completed': p_data.get('completed', False),
                        'width': p_data.get('width'),
                        'height': p_data.get('height'),
                        'quantity': p_data.get('quantity'),
                    })
            else:
                request.env['wood.piece'].create({
                    'project_id': project.id,
                    'name': p_data.get('name'),
                    'width': p_data.get('width'),
                    'height': p_data.get('height'),
                    'quantity': p_data.get('quantity'),
                    'completed': p_data.get('completed', False),
                })

        return {'status': 'success'}

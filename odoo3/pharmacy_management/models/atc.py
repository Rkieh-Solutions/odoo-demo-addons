from odoo import models, fields, api


class PharmacyATC(models.Model):
    _name = 'pharmacy.atc'
    _description = 'ATC Classification'
    _order = 'name'

    name = fields.Char(string='ATC Code', required=True, index=True)
    description = fields.Char(string='Description')
    parent_id = fields.Many2one('pharmacy.atc', string='Parent ATC', ondelete='cascade', index=True)
    child_ids = fields.One2many('pharmacy.atc', 'parent_id', string='Child ATC Codes')
    level = fields.Integer(string='Level', compute='_compute_level', store=True)
    active = fields.Boolean(default=True)

    @api.depends('parent_id')
    def _compute_level(self):
        for rec in self:
            if not rec.parent_id:
                rec.level = 1
            else:
                rec.level = rec.parent_id.level + 1

    def name_get(self):
        result = []
        for rec in self:
            name = f"[{rec.name}] {rec.description or ''}"
            result.append((rec.id, name.strip()))
        return result

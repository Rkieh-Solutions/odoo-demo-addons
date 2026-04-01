from odoo import models, fields, api


class ProductCategory(models.Model):
    _inherit = 'product.category'

    parent_category_id = fields.Many2one(
        'product.category',
        string='Main Category',
        related='parent_id',
        store=True,
    )
    is_main_category = fields.Boolean(
        string='Is Main Category',
        compute='_compute_is_main',
        store=True,
        help='True if this category has no parent (top level)',
    )

    @api.depends('parent_id')
    def _compute_is_main(self):
        for cat in self:
            cat.is_main_category = not bool(cat.parent_id)


class ProductTemplate(models.Model):
    _inherit = 'product.template'

    main_categ_id = fields.Many2one(
        'product.category',
        string='Main Category',
        compute='_compute_main_categ',
        store=True,
        help='Top-level category (auto-filled from Category)',
    )
    sub_categ_id = fields.Many2one(
        'product.category',
        string='Sub-Category',
        domain="[('parent_id', '=', main_categ_id)]",
        help='Sub-category under the main category',
    )

    @api.depends('categ_id', 'categ_id.parent_id')
    def _compute_main_categ(self):
        for product in self:
            categ = product.categ_id
            # Walk up to root
            while categ and categ.parent_id:
                categ = categ.parent_id
            product.main_categ_id = categ

    @api.onchange('categ_id')
    def _onchange_categ_id(self):
        if self.categ_id and not self.categ_id.parent_id:
            self.main_categ_id = self.categ_id
            self.sub_categ_id = False
        elif self.categ_id and self.categ_id.parent_id:
            self.sub_categ_id = self.categ_id

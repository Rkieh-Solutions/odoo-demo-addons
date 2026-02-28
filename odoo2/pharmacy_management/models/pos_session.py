from odoo import api, models


class ProductTemplatePos(models.Model):
    """Expose custom pharmacy fields to the POS frontend (template level)."""
    _inherit = 'product.template'

    # Note: _load_pos_data_fields is now handled in product_template.py
    pass


class ProductProductPos(models.Model):
    """Expose custom pharmacy fields to the POS frontend (variant level)."""
    _inherit = 'product.product'

    # Note: _load_pos_data_fields is now handled in product_product.py
    pass

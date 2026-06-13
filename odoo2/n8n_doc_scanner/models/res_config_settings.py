from odoo import fields, models


class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    n8n_url_sale_quotation = fields.Char(
        string='Sales Quotation Webhook',
        config_parameter='n8n_doc_scanner.url_sale_quotation',
        help="n8n production webhook URL for the Sales Quotation workflow.",
    )
    n8n_url_purchase_order = fields.Char(
        string='Purchase Order Webhook',
        config_parameter='n8n_doc_scanner.url_purchase_order',
        help="n8n production webhook URL for the Purchase Order workflow.",
    )
    n8n_url_receipt = fields.Char(
        string='Receipt Webhook',
        config_parameter='n8n_doc_scanner.url_receipt',
        help="n8n production webhook URL for the Receipt workflow.",
    )
    n8n_url_vendor_bill = fields.Char(
        string='Vendor Bill Webhook',
        config_parameter='n8n_doc_scanner.url_vendor_bill',
        help="n8n production webhook URL for the Vendor Bill workflow.",
    )
    n8n_auth_header_name = fields.Char(
        string='Auth Header Name',
        config_parameter='n8n_doc_scanner.auth_header_name',
        help="Optional. Header name n8n expects for authentication, e.g. "
             "'Authorization' or 'X-API-KEY'. Leave empty for unauthenticated webhooks.",
    )
    n8n_auth_token = fields.Char(
        string='Auth Token',
        config_parameter='n8n_doc_scanner.auth_token',
        help="Optional. Value sent in the auth header above, e.g. 'Bearer xxxxx'.",
    )

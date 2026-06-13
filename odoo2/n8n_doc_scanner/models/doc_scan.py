import base64
import json
import logging

import requests

from odoo import _, api, fields, models
from odoo.exceptions import UserError

_logger = logging.getLogger(__name__)

# Map each scan document type to the ir.config_parameter key that holds its
# n8n production webhook URL.
WEBHOOK_PARAM = {
    'sale_quotation': 'n8n_doc_scanner.url_sale_quotation',
    'purchase_order': 'n8n_doc_scanner.url_purchase_order',
    'receipt': 'n8n_doc_scanner.url_receipt',
    'vendor_bill': 'n8n_doc_scanner.url_vendor_bill',
}

REQUEST_TIMEOUT = 120  # n8n + AI extraction can be slow


class DocScan(models.Model):
    _name = 'scanner'
    _description = 'n8n Document Scanner'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'create_date desc'

    name = fields.Char(
        string='Reference', required=True, copy=False, readonly=True,
        default=lambda self: _('New'), tracking=True,
    )
    document_type = fields.Selection(
        selection=[
            ('sale_quotation', 'Sales Quotation'),
            ('purchase_order', 'Purchase Order'),
            ('receipt', 'Receipt'),
            ('vendor_bill', 'Vendor Bill'),
        ],
        string='Document Type', required=True, default='vendor_bill', tracking=True,
    )
    image = fields.Image(string='Scanned Document', required=False)
    image_filename = fields.Char(string='File Name')

    state = fields.Selection(
        selection=[
            ('draft', 'Draft'),
            ('sent', 'Sent to n8n'),
            ('done', 'Document Created'),
            ('error', 'Error'),
        ],
        string='Status', default='draft', required=True, tracking=True,
    )

    n8n_response = fields.Text(string='n8n Raw Response', readonly=True, copy=False)
    error_message = fields.Text(string='Error', readonly=True, copy=False)

    # Link to whatever document was created from this scan.
    result_model = fields.Char(string='Result Model', readonly=True, copy=False)
    result_res_id = fields.Integer(string='Result Id', readonly=True, copy=False)
    result_reference = fields.Reference(
        selection='_selection_result_reference', string='Created Document',
        compute='_compute_result_reference', readonly=True,
    )

    company_id = fields.Many2one(
        'res.company', string='Company', required=True,
        default=lambda self: self.env.company,
    )

    @api.model
    def _selection_result_reference(self):
        return [
            ('sale.order', 'Sales Quotation'),
            ('purchase.order', 'Purchase Order'),
            ('account.move', 'Journal Entry'),
        ]

    @api.depends('result_model', 'result_res_id')
    def _compute_result_reference(self):
        for scan in self:
            if scan.result_model and scan.result_res_id:
                scan.result_reference = '%s,%s' % (scan.result_model, scan.result_res_id)
            else:
                scan.result_reference = False

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get('name', _('New')) == _('New'):
                vals['name'] = self.env['ir.sequence'].next_by_code('scanner') or _('New')
        return super().create(vals_list)

    # ------------------------------------------------------------------
    # n8n communication
    # ------------------------------------------------------------------
    def _get_webhook_url(self):
        self.ensure_one()
        param = WEBHOOK_PARAM.get(self.document_type)
        url = self.env['ir.config_parameter'].sudo().get_param(param) if param else False
        if not url:
            raise UserError(_(
                "No n8n webhook URL is configured for document type '%s'.\n"
                "Set it in Settings > n8n Document Scanner."
            ) % dict(self._fields['document_type'].selection).get(self.document_type))
        return url.strip()

    def _get_auth_headers(self):
        ICP = self.env['ir.config_parameter'].sudo()
        headers = {'Content-Type': 'application/json'}
        header_name = (ICP.get_param('n8n_doc_scanner.auth_header_name') or '').strip()
        token = (ICP.get_param('n8n_doc_scanner.auth_token') or '').strip()
        if header_name and token:
            headers[header_name] = token
        return headers

    def action_send_to_n8n(self):
        """Send the scanned image to the n8n workflow and create the document."""
        for scan in self:
            if not scan.image:
                raise UserError(_("Please capture or upload an image first."))
            scan._send_one()
        return True

    def _send_one(self):
        self.ensure_one()
        url = self._get_webhook_url()
        payload = {
            'scan_id': self.id,
            'scan_reference': self.name,
            'document_type': self.document_type,
            'filename': self.image_filename or '%s.png' % self.name,
            'company_id': self.company_id.id,
            'company_name': self.company_id.name,
            'image_base64': self.image.decode() if isinstance(self.image, bytes) else self.image,
            'callback_base_url': self.get_base_url(),
        }
        self.write({'state': 'sent', 'error_message': False})
        # Commit the 'sent' state so a long/failed call is still traceable.
        self.env.cr.commit()

        try:
            response = requests.post(
                url, data=json.dumps(payload),
                headers=self._get_auth_headers(), timeout=REQUEST_TIMEOUT,
            )
            response.raise_for_status()
        except requests.exceptions.RequestException as exc:
            _logger.exception("n8n webhook call failed for scan %s", self.name)
            self.write({'state': 'error', 'error_message': str(exc)})
            return

        raw = response.text or ''
        self.n8n_response = raw
        try:
            data = response.json()
        except ValueError:
            self.write({
                'state': 'error',
                'error_message': _("n8n did not return valid JSON:\n%s") % raw[:2000],
            })
            return

        # n8n often wraps the result in a list (one item per node output).
        if isinstance(data, list):
            data = data[0] if data else {}
        if isinstance(data, dict) and 'data' in data and isinstance(data['data'], dict):
            # Allow {"data": {...}} envelopes.
            data = data['data']

        self.process_n8n_result(data)

    def process_n8n_result(self, data):
        """Public entry point: build the Odoo document from extracted JSON.

        ``data`` is the parsed JSON returned by n8n. Can be called directly by
        the async callback controller as well.
        """
        self.ensure_one()
        if not isinstance(data, dict):
            self.write({'state': 'error', 'error_message': _("Unexpected response format.")})
            return
        handler = {
            'sale_quotation': self._create_sale_order,
            'purchase_order': self._create_purchase_order,
            'receipt': self._create_receipt,
            'vendor_bill': self._create_vendor_bill,
        }[self.document_type]
        try:
            # Savepoint so a DB-level failure mid-create rolls back cleanly and
            # leaves the cursor usable for the error write below.
            with self.env.cr.savepoint():
                record = handler(data)
        except Exception as exc:  # noqa: BLE001 - surface any mapping error to the user
            _logger.exception("Failed to create document from scan %s", self.name)
            self.write({'state': 'error', 'error_message': str(exc)})
            return

        self.write({
            'state': 'done',
            'result_model': record._name,
            'result_res_id': record.id,
            'error_message': False,
        })
        self.message_post(body=_(
            "Created %(model)s <b>%(name)s</b> from the scanned document."
        ) % {'model': record._description, 'name': record.display_name})

    # ------------------------------------------------------------------
    # Shared extraction helpers
    # ------------------------------------------------------------------
    def _find_or_create_partner(self, data, supplier=False):
        """Resolve the partner from the extracted JSON.

        Looks under ``partner`` (dict) or flat ``partner_name``/``vat`` keys.
        """
        Partner = self.env['res.partner']
        pdata = data.get('partner')
        if isinstance(pdata, str):
            pdata = {'name': pdata}
        pdata = pdata or {}
        name = pdata.get('name') or data.get('partner_name')
        vat = pdata.get('vat') or data.get('vat')
        email = pdata.get('email') or data.get('email')

        partner = self.env['res.partner']
        if vat:
            partner = Partner.search([('vat', '=', vat)], limit=1)
        if not partner and email:
            partner = Partner.search([('email', '=', email)], limit=1)
        if not partner and name:
            partner = Partner.search([('name', '=ilike', name)], limit=1)
        if not partner and name:
            partner = Partner.create({
                'name': name,
                'vat': vat or False,
                'email': email or False,
                'phone': pdata.get('phone') or data.get('phone') or False,
                'street': pdata.get('street') or False,
                'city': pdata.get('city') or False,
                'is_company': True,
                'supplier_rank': 1 if supplier else 0,
                'customer_rank': 0 if supplier else 1,
            })
        if not partner:
            raise UserError(_("Could not determine the partner from the scanned document."))
        return partner

    def _get_lines(self, data):
        lines = data.get('lines') or data.get('items') or data.get('order_lines') or []
        return lines if isinstance(lines, list) else []

    def _resolve_product(self, line):
        Product = self.env['product.product']
        ref = line.get('product') or line.get('product_name') or line.get('description')
        product = self.env['product.product']
        code = line.get('default_code') or line.get('code')
        if code:
            product = Product.search([('default_code', '=', code)], limit=1)
        if not product and ref:
            product = Product.search([('name', '=ilike', ref)], limit=1)
        return product

    @staticmethod
    def _line_qty(line):
        return float(line.get('quantity') or line.get('qty') or 1.0)

    @staticmethod
    def _line_price(line):
        return float(line.get('price_unit') or line.get('unit_price') or line.get('price') or 0.0)

    @staticmethod
    def _line_label(line):
        return line.get('description') or line.get('product') or line.get('name') or 'Scanned line'

    def _uom_vals_for(self, model_name, product):
        """Return the UoM value dict for a line of ``model_name``.

        Tolerant of the ``product_uom`` -> ``product_uom_id`` field rename that
        landed in Odoo 19, and of the product's purchase-UoM accessor, so the
        builders keep working across versions.
        """
        if not product:
            return {}
        Line = self.env[model_name]
        field = 'product_uom_id' if 'product_uom_id' in Line._fields else 'product_uom'
        uom = getattr(product, 'uom_po_id', False) or product.uom_id
        return {field: uom.id} if uom else {}

    # ------------------------------------------------------------------
    # Document builders
    # ------------------------------------------------------------------
    def _create_sale_order(self, data):
        partner = self._find_or_create_partner(data, supplier=False)
        order_lines = []
        for line in self._get_lines(data):
            product = self._resolve_product(line)
            vals = {
                'name': self._line_label(line),
                'product_uom_qty': self._line_qty(line),
                'price_unit': self._line_price(line),
            }
            if product:
                vals['product_id'] = product.id
            order_lines.append((0, 0, vals))
        order = self.env['sale.order'].create({
            'partner_id': partner.id,
            'origin': data.get('reference') or self.name,
            'client_order_ref': data.get('reference') or False,
            'order_line': order_lines,
        })
        if data.get('notes'):
            order.message_post(body=data['notes'])
        return order

    def _create_purchase_order(self, data):
        partner = self._find_or_create_partner(data, supplier=True)
        order_lines = []
        for line in self._get_lines(data):
            product = self._resolve_product(line)
            vals = {
                'name': self._line_label(line),
                'product_qty': self._line_qty(line),
                'price_unit': self._line_price(line),
                'date_planned': fields.Datetime.now(),
            }
            if product:
                vals['product_id'] = product.id
                vals.update(self._uom_vals_for('purchase.order.line', product))
            order_lines.append((0, 0, vals))
        order = self.env['purchase.order'].create({
            'partner_id': partner.id,
            'partner_ref': data.get('reference') or False,
            'origin': self.name,
            'order_line': order_lines,
        })
        return order

    def _create_invoice(self, data, move_type):
        partner = self._find_or_create_partner(data, supplier=True)
        invoice_lines = []
        for line in self._get_lines(data):
            product = self._resolve_product(line)
            vals = {
                'name': self._line_label(line),
                'quantity': self._line_qty(line),
                'price_unit': self._line_price(line),
            }
            if product:
                vals['product_id'] = product.id
            invoice_lines.append((0, 0, vals))
        move_vals = {
            'move_type': move_type,
            'partner_id': partner.id,
            'ref': data.get('reference') or self.name,
            'invoice_line_ids': invoice_lines,
        }
        inv_date = data.get('invoice_date') or data.get('date')
        if inv_date:
            move_vals['invoice_date'] = inv_date
        return self.env['account.move'].create(move_vals)

    def _create_vendor_bill(self, data):
        return self._create_invoice(data, 'in_invoice')

    def _create_receipt(self, data):
        # Purchase receipt / expense document. account.move supports 'in_receipt'
        # when the Purchase Receipts setting is enabled; fall back to in_invoice.
        # The savepoint keeps the cursor usable if the in_receipt create raises.
        try:
            with self.env.cr.savepoint():
                return self._create_invoice(data, 'in_receipt')
        except Exception:  # noqa: BLE001
            _logger.info("in_receipt not available, falling back to in_invoice for %s", self.name)
            return self._create_invoice(data, 'in_invoice')

    # ------------------------------------------------------------------
    # UI helpers
    # ------------------------------------------------------------------
    def action_open_result(self):
        self.ensure_one()
        if not (self.result_model and self.result_res_id):
            raise UserError(_("No document has been created yet."))
        return {
            'type': 'ir.actions.act_window',
            'res_model': self.result_model,
            'res_id': self.result_res_id,
            'view_mode': 'form',
            'target': 'current',
        }

    def action_reset_to_draft(self):
        self.write({'state': 'draft', 'error_message': False})

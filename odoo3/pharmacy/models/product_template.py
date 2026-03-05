import csv
import io
import logging
from odoo import api, fields, models
from odoo.exceptions import ValidationError
from odoo.tools.float_utils import float_round

_logger = logging.getLogger(__name__)

# Excel error strings and other junk values to treat as empty
_GARBAGE_VALUES = {
    '#ref!', '#n/a', '#value!', '#div/0!',
    '#name?', '#null!', '#num!', '#error!',
    'n/a', 'na', '-',
}


def _clean(val):
    """Strip whitespace; return '' for Excel errors and N/A-like values."""
    v = (val or '').strip()
    return '' if v.lower() in _GARBAGE_VALUES else v


def _detect_delimiter(content):
    """Return '\t' if the first line contains tabs, else ','."""
    if not content:
        return ','
    first_line = content.split('\n', 1)[0]
    return '\t' if '\t' in first_line else ','


class ProductTemplate(models.Model):
    _inherit = "product.template"

    # --- Box/Envelope Management (from pharmacy) ---
    is_box_product = fields.Boolean(
        string='Box',
        help="If checked, this product can be sold by box or by envelope/piece."
    )
    envelope_child_id = fields.Many2one(
        'product.template',
        string='Envelope/Child Product',
        help="The linked child product representing individual envelopes/pieces."
    )
    parent_box_id = fields.Many2one(
        'product.template',
        string='Parent Box Product',
        help="The linked parent product representing the box."
    )
    envelopes_per_box = fields.Integer(
        string='Envelopes in Box',
        default=1,
        help="Number of envelopes/pieces inside one box."
    )
    opened_envelopes_qty = fields.Integer(
        string='Loose Envelopes Qty (Internal)',
        default=0,
    )
    envelope_price = fields.Float(
        string='Envelope Price',
        help="Price for one individual envelope/piece."
    )

    envelope_qty = fields.Integer(
        string="Envelope/Needle Qty",
        compute="_compute_envelope_qty",
        help="Quantity of loose envelopes/needles (stock of the child product)."
    )

    box_qty = fields.Integer(
        string="Box Qty On Hand",
        compute="_compute_box_qty",
        help="Quantity of full boxes on hand."
    )

    # --- Clinical / Pharmacy Extension Fields (from pharmacy_extension) ---
    code = fields.Char(
        string="Code",
        required=False,
        copy=False,
        index=True,
        help="Unique numeric product identifier (e.g. 10574). Stored as text to preserve leading zeros.",
    )

    composition = fields.Many2many(
        comodel_name="pharmacy.composition",
        relation="product_template_pharmacy_composition_rel",
        column1="product_tmpl_id",
        column2="composition_id",
        string="Composition",
    )

    form_id = fields.Many2one(
        "pharmacy.form",
        string="Form",
        ondelete="restrict",
    )
    stratum_id = fields.Many2one(
        "pharmacy.stratum",
        string="Stratum",
        ondelete="restrict",
        index=True,
    )
    strength_id = fields.Many2one(
        "pharmacy.strength",
        string="Strength",
        ondelete="restrict",
        index=True,
    )
    presentation_id = fields.Many2one(
        "pharmacy.presentation",
        string="Presentation",
        ondelete="restrict",
        index=True,
    )
    atc_id = fields.Many2one(
        "pharmacy.atc",
        string="ATC Code",
        ondelete="restrict",
        index=True,
    )
    registration_number = fields.Char(
        string="Registration No.",
        index=True,
        help="Official drug registration number issued by the health authority."
    )

    agent_id = fields.Many2one(
        "res.partner",
        string="Agent",
        ondelete="set null",
        index=True,
        domain="[('is_company', '=', True)]",
        context={'default_is_company': True},
        help="Commercial agent / local representative. Created automatically on import if missing.",
    )
    responsible_party_id = fields.Many2one(
        "res.partner",
        string="Responsible Party",
        ondelete="set null",
        index=True,
        domain="[('is_company', '=', True)]",
        context={'default_is_company': True},
        help="Regulatory responsible party. Created automatically on import if missing.",
    )

    composition_text = fields.Char(
        string="Composition Text",
        compute="_compute_composition_text",
        store=True,
    )

    pharmacy_margin_input = fields.Char(
        string="Margin (%)",
        help="Enter margin like 25 or 25%. Sale price will be calculated automatically.",
    )

    pharmacy_margin = fields.Float(
        string="Margin Value",
        readonly=True,
    )

    # _sql_constraints = [
    #     (
    #         'code_uniq',
    #         'unique(code)',
    #         'A product with this code already exists. The code must be unique.',
    #     ),
    # ]

    # --- Constraints & Compuates ---

    # @api.constrains('code')
    # def _check_unique_code(self):
    #     for rec in self:
    #         if not rec.code:
    #             continue
    #         domain = [('code', '=', rec.code), ('id', '!=', rec.id)]
    #         if self.search_count(domain) > 0:
    #             raise ValidationError(
    #                 f"The code '{rec.code}' is already assigned to another product. "
    #                 "Each product must have a unique code."
    #             )

    @api.depends('qty_available', 'envelope_child_id.qty_available', 'parent_box_id.qty_available')
    def _compute_envelope_qty(self):
        for product in self:
            if product.envelope_child_id:
                product.envelope_qty = int(round(product.envelope_child_id.qty_available))
            elif product.parent_box_id:
                product.envelope_qty = int(round(product.qty_available))
            else:
                product.envelope_qty = 0

    @api.depends('qty_available')
    def _compute_box_qty(self):
        for product in self:
            product.box_qty = int(round(product.qty_available))

    @api.depends("composition.name")
    def _compute_composition_text(self):
        for rec in self:
            rec.composition_text = ", ".join(rec.composition.mapped("name"))

    # --- Box Actions ---

    def action_open_new_box(self):
        """Logic to open a box and convert it into envelopes (Child product stock)."""
        self.ensure_one()
        if self.parent_box_id:
            return self.parent_box_id.action_open_new_box()

        if not self.is_box_product or not self.envelope_child_id:
            return {
                'type': 'ir.actions.client',
                'tag': 'display_notification',
                'params': {
                    'title': 'Configuration Missing',
                    'message': 'This product must be marked as a Box and linked to an Envelope product.',
                    'type': 'warning',
                    'sticky': False,
                }
            }

        if self.qty_available < 1:
            return {
                'type': 'ir.actions.client',
                'tag': 'display_notification',
                'params': {
                    'title': 'No Full Boxes',
                    'message': 'You do not have any unopened boxes available.',
                    'type': 'danger',
                    'sticky': False,
                }
            }

        warehouse = self.env['stock.warehouse'].search([], limit=1)
        location = warehouse.lot_stock_id if warehouse else None
        if not location:
            return

        box_product = self.product_variant_id
        env_product = self.envelope_child_id.product_variant_id

        if not box_product or not env_product:
            return

        self.env['stock.quant']._update_available_quantity(box_product, location, -1)
        self.env['stock.quant']._update_available_quantity(env_product, location, self.envelopes_per_box)

        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': 'Box Opened',
                'message': f'Deducted 1 Box and added {self.envelopes_per_box} envelopes to {self.envelope_child_id.name}.',
                'type': 'success',
                'sticky': False,
            }
        }

    # --- Margin Calculation Logic ---

    @staticmethod
    def _parse_margin(value):
        if not value:
            return 0.0
        if isinstance(value, str):
            value = value.replace("%", "").strip()
        try:
            return float(value)
        except Exception:
            return 0.0

    @staticmethod
    def _compute_sale(cost, margin):
        cost = cost or 0.0
        margin = margin or 0.0
        return float_round(cost * (1 + margin / 100.0), 2)

    @staticmethod
    def _compute_margin_from_price(cost, sale_price):
        if not cost or cost == 0.0:
            return 0.0
        return float_round(((sale_price / cost) - 1) * 100.0, 2)

    @api.onchange("list_price")
    def _onchange_list_price(self):
        for rec in self:
            cost = rec.standard_price or 0.0
            sale = rec.list_price or 0.0
            if cost > 0:
                margin = self._compute_margin_from_price(cost, sale)
                rec.pharmacy_margin = margin
                rec.pharmacy_margin_input = str(margin)

    @api.onchange("pharmacy_margin_input")
    def _onchange_pharmacy_margin_input(self):
        for rec in self:
            margin = self._parse_margin(rec.pharmacy_margin_input)
            rec.pharmacy_margin = margin
            cost = rec.standard_price or 0.0
            if cost > 0:
                rec.list_price = self._compute_sale(cost, margin)

    @api.onchange("standard_price")
    def _onchange_standard_price(self):
        for rec in self:
            margin = rec.pharmacy_margin or 0.0
            cost = rec.standard_price or 0.0
            if cost > 0 and margin > 0:
                rec.list_price = self._compute_sale(cost, margin)

    # --- MOH Import Helpers ---

    @api.model
    def load(self, fields, data):
        new_data = []
        for row in data:
            new_data.append([_clean(val) for val in row])
        data = new_data

        try:
            code_idx = fields.index("code")
    #         if not rec.code:
    #         domain = [('code', '=', rec.code), ('id', '!=', rec.id)]
    #                 f"The code '{rec.code}' is already assigned to another product. "
        except ValueError:
            code_idx = -1

        if "id" not in fields and code_idx != -1:
            fields.insert(0, "id")
            for row in data:
                code_val = row[code_idx]
                if code_val:
                    ext_id = f"__import__.product_moh_{code_val}"
                    row.insert(0, ext_id)
                else:
                    row.insert(0, False)
        return super().load(fields, data)

    @api.model
    def _resolve_country(self, name):
        if not name:
            return self.env["res.country"]
        name = name.strip()
        country = self.env["res.country"].search([("name", "=ilike", name)], limit=1)
        if not country:
            country = self.env["res.country"].search([("code", "=ilike", name)], limit=1)
        return country

    @api.model
    def _get_or_create_partner(self, name):
        name = (name or "").strip()
        if not name:
            return self.env["res.partner"]
        partner = self.env["res.partner"].search([("name", "=", name), ("is_company", "=", True)], limit=1)
        if not partner:
            partner = self.env["res.partner"].create({"name": name, "is_company": True})
        return partner

    @api.model
    def _enrich_partner_country(self, partner, country_name):
        if partner and not partner.country_id and country_name:
            country = self._resolve_country(country_name)
            if country:
                partner.country_id = country

    @api.model
    def import_moh_csv(self, csv_content):
        Partner = self.env["res.partner"]
        warnings_list = []
        updated = 0
        skipped = 0
        partner_cache = {}
        country_cache = {}

        def resolve_country(name):
            name = _clean(name)
            if not name:
                return self.env["res.country"]
            if name not in country_cache:
                c = self.env["res.country"].search([("name", "=ilike", name)], limit=1)
                if not c:
                    c = self.env["res.country"].search([("code", "=ilike", name)], limit=1)
                country_cache[name] = c
            return country_cache[name]

        def enrich_country(partner, country_name):
            if partner and not partner.country_id:
                c = resolve_country(country_name)
                if c:
                    partner.country_id = c

        def get_or_create_company(name):
            name = _clean(name)
            if not name:
                return self.env["res.partner"]
            if name not in partner_cache:
                p = Partner.search([("name", "=", name), ("is_company", "=", True)], limit=1)
                if not p:
                    p = Partner.create({"name": name, "is_company": True})
                partner_cache[name] = p
            return partner_cache[name]

        delimiter = _detect_delimiter(csv_content)
        reader = csv.DictReader(io.StringIO(csv_content), delimiter=delimiter)

        for raw_row in reader:
            row = {k.strip().lower(): _clean(v) for k, v in raw_row.items()}
            product_code = row.get("code", "")
            if not product_code:
                skipped += 1
                continue

            product = self.search([("code", "=", product_code)], limit=1)
            if not product:
                skipped += 1
                _logger.warning("import_moh_csv: product code '%s' not found.", product_code)
                continue

            vals = {}
            agent_name = row.get("agent", "")
            if agent_name:
                agent = get_or_create_company(agent_name)
                if agent:
                    vals["agent_id"] = agent.id

            rp_name = row.get("responsible party name", "")
            if not rp_name:
                vals["responsible_party_id"] = False
            else:
                rp = get_or_create_company(rp_name)
                if rp:
                    enrich_country(rp, row.get("responsible party country", ""))
                    vals["responsible_party_id"] = rp.id

            if vals:
                product.write(vals)
                updated += 1

        return {"updated": updated, "skipped": skipped, "warnings": warnings_list}

    # --- Overrides ---

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            has_margin = "pharmacy_margin_input" in vals
            has_price = "list_price" in vals
            cost = vals.get("standard_price", 0.0) or 0.0

            if has_margin:
                margin = self._parse_margin(vals.get("pharmacy_margin_input"))
                vals["pharmacy_margin"] = margin
                if cost:
                    vals["list_price"] = self._compute_sale(cost, margin)
            elif has_price and cost:
                sale = vals.get("list_price", 0.0) or 0.0
                margin = self._compute_margin_from_price(cost, sale)
                vals["pharmacy_margin"] = margin
                vals["pharmacy_margin_input"] = str(margin)

        return super().create(vals_list)

    @api.model
    def _load_pos_data_fields(self, config):
        fields = super()._load_pos_data_fields(config)
        if 'qty_available' not in fields:
            fields.append('qty_available')
        if 'composition' not in fields:
            fields.append('composition')
        if 'composition_text' not in fields:
            fields.append('composition_text')
        if 'is_box_product' not in fields:
            fields.append('is_box_product')
        if 'envelope_child_id' not in fields:
            fields.append('envelope_child_id')
        if 'envelopes_per_box' not in fields:
            fields.append('envelopes_per_box')
        if 'parent_box_id' not in fields:
            fields.append('parent_box_id')
        if 'code' not in fields:
            fields.append('code')
        return fields

    @api.model
    def _load_pos_data_read(self, records, config):
        res = super()._load_pos_data_read(records, config)
        # Use a map for efficiency and ensure we get the float value directly
        product_map = {p.id: p.qty_available for p in records}
        for r in res:
            r['qty_available'] = product_map.get(r['id'], 0.0)
        return res

    def write(self, vals):
        # Handle Margin/Price updates
        if "pharmacy_margin_input" in vals or "standard_price" in vals:
            for rec in self:
                # Use a fresh dict to avoid type inference issues
                upd = dict(vals)
                margin = rec.pharmacy_margin
                if "pharmacy_margin_input" in vals:
                    # Ensure string format for parser
                    val_input = str(vals.get("pharmacy_margin_input", ""))
                    margin = self._parse_margin(val_input)
                
                upd["pharmacy_margin"] = margin
                cost = vals.get("standard_price", rec.standard_price)
                upd["list_price"] = self._compute_sale(cost, margin)
                super(ProductTemplate, rec).write(upd)
            return True

        if "list_price" in vals:
            for rec in self:
                upd = dict(vals)
                cost = rec.standard_price or 0.0
                sale = vals.get("list_price", 0.0) or 0.0
                if cost > 0:
                    margin = self._compute_margin_from_price(cost, sale)
                    upd["pharmacy_margin"] = margin
                    upd["pharmacy_margin_input"] = str(margin)
                super(ProductTemplate, rec).write(upd)
            return True

        return super().write(vals)

# n8n Document Scanner (Odoo 19)

Capture a document with your device camera inside Odoo, send it to the matching
**n8n** workflow for AI/OCR extraction, and create the corresponding draft
document automatically.

| Scan type        | n8n workflow      | Odoo document created                 |
|------------------|-------------------|---------------------------------------|
| Sales Quotation  | Sales Quotation   | `sale.order` (draft quotation)        |
| Purchase Order   | Purchase order    | `purchase.order` (RFQ)                |
| Receipt          | recipt            | `account.move` (`in_receipt` / bill)  |
| Vendor Bill      | vendor bill       | `account.move` (`in_invoice`)         |

## Flow

```
Odoo (camera)  --image base64-->  n8n webhook  --extracted JSON-->  Odoo  -->  draft doc
```

1. User opens **Document Scanner → Scans**, creates a scan, picks the type, takes a photo.
2. Click **Send to n8n**. Odoo POSTs JSON to the configured webhook for that type.
3. n8n reads the document and returns structured JSON (see contract below).
4. Odoo parses it and creates the matching draft record, linked back on the scan.

There are **two** ways n8n can return the data:

- **Synchronous (recommended):** the n8n workflow's last node is a *Respond to
  Webhook* node returning the JSON. Odoo creates the document from the HTTP
  response immediately.
- **Asynchronous:** the workflow does its own thing and later POSTs the result
  to Odoo's callback endpoint `POST /n8n_doc_scanner/result`.

## Install

1. Copy the `n8n_doc_scanner` folder into your Odoo `addons` path on
   `odoo2.rkiehsolutions.com`.
2. *Apps → Update Apps List*, then install **n8n Document Scanner**.
3. *Settings → n8n Document Scanner*: paste the **production webhook URL** of
   each workflow, and optionally an auth header name + token.

> ⚠️ The camera live-preview (`getUserMedia`) only works over **HTTPS** (your
> domain already is) or `localhost`.

## Request Odoo sends TO n8n

`Content-Type: application/json` (+ your optional auth header):

```json
{
  "scan_id": 12,
  "scan_reference": "SCAN/2026/00012",
  "document_type": "vendor_bill",
  "filename": "scan_1718270000000.png",
  "company_id": 1,
  "company_name": "Rkieh Solutions",
  "image_base64": "<base64 PNG, no data: prefix>",
  "callback_base_url": "https://odoo2.rkiehsolutions.com"
}
```

In n8n: decode `image_base64` (Move Binary Data / Code node) and feed it to your
OCR/AI node.

## Response n8n must return TO Odoo

Return a single JSON object (a top-level array `[ {...} ]` or a `{"data": {...}}`
envelope are also accepted). Fields are matched leniently — missing ones are
skipped.

```json
{
  "reference": "INV-2025-0042",
  "invoice_date": "2026-06-13",
  "partner": {
    "name": "ACME Supplies LLC",
    "vat": "SA1234567890003",
    "email": "billing@acme.com",
    "phone": "+966500000000",
    "street": "King Fahd Rd",
    "city": "Riyadh"
  },
  "lines": [
    { "product": "Steel bolt M8", "description": "Steel bolt M8 x100",
      "quantity": 100, "price_unit": 0.45, "default_code": "BOLT-M8" },
    { "description": "Delivery fee", "quantity": 1, "price_unit": 25.0 }
  ],
  "notes": "Net 30"
}
```

Field resolution:

- **partner** — matched by `vat`, then `email`, then name (case-insensitive).
  Created automatically if not found (as supplier for PO/bill/receipt, customer
  for quotation).
- **lines[].product / default_code** — matched to an existing product; if none
  is found the line is kept as a description-only line with the given qty/price.
- **quantity** accepts `quantity` or `qty`; **price** accepts `price_unit`,
  `unit_price` or `price`; **label** accepts `description`/`product`/`name`.

If your workflows already output a different shape, either add a *Set/Code* node
in n8n to map to the above, or adjust the builder methods in
`models/doc_scan.py` (`_create_sale_order`, `_create_purchase_order`,
`_create_invoice`).

## Async callback (optional)

If a workflow finishes asynchronously, POST back to:

```
POST https://odoo2.rkiehsolutions.com/n8n_doc_scanner/result
Content-Type: application/json

{ "scan_id": 12, "token": "<your auth token>", "data": { ...same shape as above... } }
```

The `token` (or `X-API-KEY` / `Authorization` header) must equal the **Auth
Token** configured in Settings. If no token is configured the endpoint is open
(use only on a trusted network).

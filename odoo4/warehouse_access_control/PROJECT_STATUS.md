# Warehouse Access Control — Project Status

**Module:** `warehouse_access_control`
**Version:** `19.0.3.0.0`
**Odoo:** 19.0 Enterprise
**Instance:** odoo2 — https://odoo2.rkiehsolutions.com
**Last updated:** 2026-03-29

---

## ✅ COMPLETED

### Phase 1 — Security Groups & Access
- 15 custom groups under privilege "Warehouse Custom Roles"
- All groups now imply `base.group_user` (required for backend login — see licensing note below)
- 130+ CRUD access rules in `ir.model.access.csv` covering all models
- `res.partner`, `res.users`, `res.company`, `uom.uom` read access added for all roles
- 6 record rules for row-level data filtering (updated to work with unassigned records)

### Phase 2 — Skid Model
- `warehouse.skid`: auto ID (SKD-XXXXXX), picking, picker/checker, weight, staging, contents
- `warehouse.skid.line`: product, lot, qty, linked to stock.move.line
- Workflow: draft → picking → picked → checking → checked → dispatched
- `mail.thread` + chatter + activity mixin enabled

### Phase 3 — Picking Workflow
- Custom status bar on stock.picking: released → picking_in_progress → pending_checking → checking_in_progress → checked_complete → ready_dispatch
- Location-sorted pick ticket (by picking_sequence / aisle / rack / bin)
- Role-restricted buttons: Start Picking, Confirm Picked, Start Checking, Confirm Checked, Ready for Dispatch, Assign to Skid, Log Exception, Scan Barcode
- Skid Assign Wizard: assign move lines to skids, optional new skid creation
- Checker Exception Wizard: log discrepancies, flag exception

### Phase 4 — Inventory Enhancements
- Margin & Margin % computed fields on product.template (stored)
- Main Category / Sub-Category navigation
- Enhanced product list: cost, margin, margin%, category columns (role-restricted)
- Stock quant list with reserved quantity column

### Phase 5 — Quality Customization
- `quality.capa` model: CAPA/YYYY/NNNN reference, full action workflow
- Quality Alert extension: CAPA stat button + Create CAPA button
- Transfer validation blocker: raises UserError if any quality check = 'fail'
- Quality Checks button on picking form (role-restricted)

### Phase 6 — Delivery Note PDF
- QWeb PDF report on stock.picking
- Header, skid summary, per-skid detail, product table, signature lines

### Phase 7 — Dashboards
- `warehouse.dashboard` model with computed KPIs
- Picking, Quality, Inventory, Manufacturing KPI sections
- Each KPI links to the relevant list view
- Menu: Warehouse → Dashboard (sequence=1)

### Phase 8 — Mobile / Barcode Interface
- Mobile Picker: My Transfers (kanban), Pick Lines (sorted list)
- Mobile Checker: Transfers to Check (list), Skid detail form
- Mobile Shop Floor: My Work Orders (kanban)
- Barcode Scan Wizard: scan → find product → confirm qty_done + lot
- Scan Barcode button on picking form header
- Mobile submenu: Warehouse → Mobile

### Demo Data
- **Warehouse layout:** 25 locations — Receiving, Aisle A (9 bins), Aisle B (9 bins), Aisle C (4 bins), Staging
- **12 products** with barcodes assigned to specific bin locations
- **3 product category trees:** Hardware (Fasteners, Power Tools, Hand Tools), Safety Equipment (Gloves, Helmets), Consumables (Cleaning, Lubricants)
- **1 demo customer:** Acme Construction Ltd
- **1 demo sales order:** S00001 → picking WH/OUT/00001 (status: released, ready to pick)

---

## 🐛 BUGS FIXED (session log)

| Bug | Fix |
|---|---|
| `wizard` package not imported | Added `from . import wizard` to `__init__.py` |
| `product_template_list_view` wrong xmlid | Changed to `product_template_tree_view` |
| `incoming_qty` not on `stock.quant` | Removed from quant list view |
| `target=inline` removed in Odoo 19 | Changed to `target=current` |
| `tracking=True` without `mail.thread` | Added `mail.thread` + `mail.activity.mixin` to `warehouse.skid` |
| Wizard models missing access rules | Added 5 CSV rows with `base.group_user` |
| Users redirected to `/my` portal | Added `base.group_user` to all 15 group `implied_ids` + patched existing users |
| `res.partner` 403 on all roles | Added read access to 13 missing groups |
| `res.users` 403 on all roles | Added read access to all 15 groups |
| `res.company` + `uom.uom` 403 (proactive) | Added read access to all 15 groups |
| Picker sees no transfers ("My Transfers" filter) | Removed `search_default_my_transfers` from mobile action context |
| Record rules had `noupdate=1`, ignored updates | Updated rules directly in DB + set `noupdate=False` in `ir.model.data` |
| Picker rule too strict (`user_id = me` only) | Changed to `released OR user_id = me` so unassigned transfers are visible |
| Skid rule too strict (`picker_id = me` only) | Changed to `picker_id = me OR picker_id = False` |
| Products created as `consu` (no stock tracking) | Set `is_storable=True` (Odoo 19 storable = `type=consu` + `is_storable=True`) |
| `groups_id` field rename in Odoo 19 | Use `group_ids` instead |
| `uom_po_id` field removed in Odoo 19 | Removed from product create call |
| Product type `'product'` removed in Odoo 19 | Use `type='consu'` + `is_storable=True` |

---

## 👥 Users

**Password for all custom role users:** `Warehouse2024!`

| Login | Name | Role |
|---|---|---|
| `quality.user1` | Alice Tremblay | Quality User |
| `quality.mgr1` | Bernard Lavoie | Quality Manager |
| `picker1` | Carlos Dumont | Picker |
| `picker2` | Danielle Roy | Picker |
| `checker1` | Eric Gagnon | Checker |
| `dispatch1` | Fatima Chouinard | Dispatch Coordinator |
| `wh.supervisor1` | Georges Beaumont | Warehouse Supervisor |
| `inv.viewer1` | Hana Ouellet | Inventory Viewer |
| `inv.editor1` | Ibrahim Fortier | Inventory Editor |
| `shopfloor1` | Julie Pelletier | Shop Floor Operator |
| `planner1` | Kevin Bergeron | Production Planner |
| `maint.user1` | Laura Morin | Maintenance User |
| `report.viewer1` | Marc Leclerc | Report Viewer |
| `purchasing1` | Nadia Bouchard | Purchasing User |
| `sales.coord1` | Pascale Leblanc | Sales Coordinator |
| `finance.viewer1` | Olivier Gauthier | Finance Viewer |

**Admin:** `odoo2` / `odoo2`

---

## ⚠️ PENDING — Client Input Needed

- [ ] **3 Admin users** — provide names, emails, passwords (counted in license)
- [ ] **Replace demo user names/logins** with real client staff
- [ ] **Barcode hardware** — assign real barcodes to products matching physical labels
- [ ] **Staging location config** — assign proper staging area per warehouse zone
- [ ] **Quality control points** — set up quality.point records per product/operation
- [ ] **Odoo license discussion** — all 15 custom role users now have `base.group_user` and WILL count toward the Odoo subscription. Confirm with Odoo account manager whether a light-user plan or different arrangement applies.

---

## ⚠️ PENDING — Technical / Optional

- [ ] **Home action per role** — redirect each role to their most-used screen on login (currently all land on standard home)
- [ ] **Delivery Note button** — add a "Print Delivery Note" button directly on the picking form for easy access
- [ ] **Email notifications** — notify checker when a picking reaches `pending_checking`
- [ ] **Low stock alerts** — configure reorder rules on demo products
- [ ] **Dispatch report** — list of all `ready_dispatch` pickings with total weights per staging location
- [ ] **Further 403 errors** — may appear as users explore more screens; fix by adding read access per model as needed

---

## 🔑 Key Technical Notes (Odoo 19)

| Topic | Detail |
|---|---|
| Groups | Use `privilege_id` → `res.groups.privilege` (not `category_id`, removed in 19) |
| User groups field | `group_ids` (not `groups_id`) |
| Backend access | `base.group_user` is mandatory — no way around it |
| Storable products | `type='consu'` + `is_storable=True` (not `type='product'`) |
| Record rules with `noupdate=1` | Must update DB directly or set `noupdate=False` in `ir.model.data` |
| `target=inline` | Removed in Odoo 19 — use `target=current` |
| Product list view xmlid | `product.product_template_tree_view` (not `product_template_list_view`) |
| TransientModel access | Wizards need CSV access rules with `base.group_user` |
| `mail.thread` | Required on any model using `tracking=True` |
| `search_default_*` context | Avoid on picker/checker actions — hides unassigned records |

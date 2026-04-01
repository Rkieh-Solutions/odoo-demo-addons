# Warehouse Access Control — Implementation Plan
**Project:** Warehouse Management Customization
**Platform:** Odoo 19 (odoo2 instance)
**Date:** 2026-03-29

---

## 1. Project Overview

This document defines the full implementation plan for a custom Odoo module
that introduces 15 warehouse-specific user roles. These roles are built outside
the standard Odoo internal user hierarchy and do NOT count toward the Odoo
subscription license.

The solution combines:
- Customized Odoo backend (office roles)
- Odoo Barcode / mobile interface (floor roles)
- Custom login redirect (each user lands on their own dashboard)

---

## 2. Modules Covered

| Module | Scope |
|---|---|
| Quality | Inspections, alerts, CAPA, reporting |
| Inventory & Warehouse | Stock, products, margins, categories |
| Manufacturing | MOs, BoM, work centers, routing |
| Sales Order Preparation | Picking, skids, checking, dispatch |
| Reporting | Dashboards, KPIs, exports |
| Maintenance | Breakdown logs, preventive schedules |
| Purchasing | Receipts, supplier quality |

---

## 3. User Roles & Access Rights

### 3.1 Role Overview

| # | Role | Interface | Type |
|---|------|-----------|------|
| 1 | Quality User | Backend (restricted) | Custom |
| 2 | Quality Manager | Backend (restricted) | Custom |
| 3 | Picker | Barcode / Mobile | Custom |
| 4 | Checker | Barcode / Mobile | Custom |
| 5 | Dispatch Coordinator | Backend (restricted) | Custom |
| 6 | Warehouse Supervisor | Backend (restricted) | Custom |
| 7 | Inventory Viewer | Backend (read-only) | Custom |
| 8 | Inventory Editor | Backend (restricted) | Custom |
| 9 | Shop Floor Operator | Barcode / Mobile | Custom |
| 10 | Production Planner | Backend (restricted) | Custom |
| 11 | Maintenance User | Backend (restricted) | Custom |
| 12 | Report Viewer | Backend (read-only) | Custom |
| 13 | Purchasing User | Backend (restricted) | Custom |
| 14 | Sales Coordinator | Backend (read-only) | Custom |
| 15 | Finance Viewer | Backend (read-only) | Custom |

---

### 3.2 Detailed Access Matrix

#### Quality User (Role 1)
| Object | Create | Read | Write | Delete |
|---|---|---|---|---|
| Quality Check | ✅ | ✅ | ✅ (own) | ❌ |
| Quality Alert | ✅ | ✅ | ✅ (own) | ❌ |
| Quality Control Point | ❌ | ✅ | ❌ | ❌ |
| Products | ❌ | ✅ | ❌ | ❌ |
| Inventory Moves | ❌ | ✅ | ❌ | ❌ |
| Reports | ❌ | ✅ (own) | ❌ | ❌ |

**Menus visible:** Quality > Checks, Quality > Alerts
**Redirect on login:** Quality dashboard

---

#### Quality Manager (Role 2)
| Object | Create | Read | Write | Delete |
|---|---|---|---|---|
| Quality Check | ✅ | ✅ | ✅ | ✅ |
| Quality Alert | ✅ | ✅ | ✅ | ✅ |
| Quality Control Point | ✅ | ✅ | ✅ | ✅ |
| Products | ❌ | ✅ | ❌ | ❌ |
| Inventory Moves | ❌ | ✅ | ❌ | ❌ |
| Reports | ❌ | ✅ (all) | ❌ | ❌ |
| CAPA Actions | ✅ | ✅ | ✅ | ✅ |

**Menus visible:** Full Quality menu + Reports
**Redirect on login:** Quality KPI dashboard

---

#### Picker (Role 3)
| Object | Create | Read | Write | Delete |
|---|---|---|---|---|
| Sales Order | ❌ | ✅ (assigned) | ❌ | ❌ |
| Picking / Transfer | ❌ | ✅ (assigned) | ✅ (confirm picks) | ❌ |
| Skid (custom) | ✅ | ✅ (own) | ✅ (own) | ❌ |
| Skid Weight (custom) | ✅ | ✅ (own) | ✅ (own) | ❌ |
| Product | ❌ | ✅ | ❌ | ❌ |
| Stock Location | ❌ | ✅ | ❌ | ❌ |

**Interface:** Odoo Barcode app (mobile/RF scanner)
**Redirect on login:** Picking orders list

---

#### Checker (Role 4)
| Object | Create | Read | Write | Delete |
|---|---|---|---|---|
| Sales Order | ❌ | ✅ (assigned) | ❌ | ❌ |
| Picking / Transfer | ❌ | ✅ | ✅ (verify & approve) | ❌ |
| Skid (custom) | ❌ | ✅ | ✅ (verify weight/qty) | ❌ |
| Skid Weight (custom) | ❌ | ✅ | ✅ (update with reason) | ❌ |
| Product | ❌ | ✅ | ❌ | ❌ |
| Stock Location | ❌ | ✅ | ❌ | ❌ |

**Interface:** Odoo Barcode app (mobile/RF scanner)
**Redirect on login:** Pending checking orders list

---

#### Dispatch Coordinator (Role 5)
| Object | Create | Read | Write | Delete |
|---|---|---|---|---|
| Sales Order | ❌ | ✅ | ❌ | ❌ |
| Picking / Transfer | ❌ | ✅ | ✅ (staging & dispatch) | ❌ |
| Skid (custom) | ❌ | ✅ | ✅ (staging location) | ❌ |
| Delivery Note | ❌ | ✅ | ✅ | ❌ |
| Stock Location | ❌ | ✅ | ❌ | ❌ |

**Menus visible:** Inventory > Transfers, Delivery, Dispatch
**Redirect on login:** Ready for dispatch list

---

#### Warehouse Supervisor (Role 6)
| Object | Create | Read | Write | Delete |
|---|---|---|---|---|
| Sales Order | ❌ | ✅ | ❌ | ❌ |
| Picking / Transfer | ❌ | ✅ | ✅ | ❌ |
| Skid (custom) | ❌ | ✅ | ✅ | ❌ |
| Products | ❌ | ✅ | ❌ | ❌ |
| Stock | ❌ | ✅ | ❌ | ❌ |
| Quality Alerts | ❌ | ✅ | ❌ | ❌ |
| Reports | ❌ | ✅ | ❌ | ❌ |

**Menus visible:** All warehouse + reports (no config)
**Redirect on login:** Warehouse overview dashboard

---

#### Inventory Viewer (Role 7)
| Object | Create | Read | Write | Delete |
|---|---|---|---|---|
| Products | ❌ | ✅ | ❌ | ❌ |
| Stock Quants | ❌ | ✅ | ❌ | ❌ |
| Inventory Reports | ❌ | ✅ | ❌ | ❌ |
| Margins (custom) | ❌ | ✅ | ❌ | ❌ |
| Product Categories | ❌ | ✅ | ❌ | ❌ |

**Menus visible:** Inventory > Products, Reports (read-only)
**Redirect on login:** Inventory overview (read-only)

---

#### Inventory Editor (Role 8)
| Object | Create | Read | Write | Delete |
|---|---|---|---|---|
| Products | ✅ | ✅ | ✅ | ❌ |
| Product Categories | ✅ | ✅ | ✅ | ❌ |
| Stock Quants | ❌ | ✅ | ✅ (adjustments) | ❌ |
| Inventory Adjustments | ✅ | ✅ | ✅ | ❌ |
| Margins (custom) | ❌ | ✅ | ❌ | ❌ |
| Reordering Rules | ✅ | ✅ | ✅ | ❌ |

**Menus visible:** Full Inventory (no settings/config)
**Redirect on login:** Products list

---

#### Shop Floor Operator (Role 9)
| Object | Create | Read | Write | Delete |
|---|---|---|---|---|
| Manufacturing Order | ❌ | ✅ (assigned) | ✅ (confirm operations) | ❌ |
| Work Order | ❌ | ✅ (assigned) | ✅ (log time, confirm) | ❌ |
| Quality Check | ❌ | ✅ | ✅ (fill result) | ❌ |
| Scrap | ✅ | ✅ (own) | ❌ | ❌ |
| Products | ❌ | ✅ | ❌ | ❌ |

**Interface:** Odoo Barcode / Manufacturing tablet view
**Redirect on login:** My work orders list

---

#### Production Planner (Role 10)
| Object | Create | Read | Write | Delete |
|---|---|---|---|---|
| Manufacturing Order | ✅ | ✅ | ✅ | ❌ |
| Bill of Materials | ✅ | ✅ | ✅ | ❌ |
| Routing / Operations | ✅ | ✅ | ✅ | ❌ |
| Work Centers | ❌ | ✅ | ✅ | ❌ |
| Products | ❌ | ✅ | ❌ | ❌ |
| Stock | ❌ | ✅ | ❌ | ❌ |

**Menus visible:** Manufacturing > Orders, BoM, Routing, Reports
**Redirect on login:** Manufacturing orders list

---

#### Maintenance User (Role 11)
| Object | Create | Read | Write | Delete |
|---|---|---|---|---|
| Maintenance Request | ✅ | ✅ | ✅ (own) | ❌ |
| Maintenance Equipment | ❌ | ✅ | ❌ | ❌ |
| Preventive Schedule | ❌ | ✅ | ❌ | ❌ |
| Work Orders (MFG) | ❌ | ✅ | ❌ | ❌ |

**Menus visible:** Maintenance > Requests, Equipment
**Redirect on login:** Maintenance requests list

---

#### Report Viewer (Role 12)
| Object | Create | Read | Write | Delete |
|---|---|---|---|---|
| All Reports | ❌ | ✅ | ❌ | ❌ |
| Dashboards | ❌ | ✅ | ❌ | ❌ |
| KPIs | ❌ | ✅ | ❌ | ❌ |
| Products | ❌ | ✅ | ❌ | ❌ |
| Stock | ❌ | ✅ | ❌ | ❌ |

**Menus visible:** Reporting menu only
**Redirect on login:** Reports dashboard

---

#### Purchasing User (Role 13)
| Object | Create | Read | Write | Delete |
|---|---|---|---|---|
| Purchase Order | ❌ | ✅ | ❌ | ❌ |
| Receipts / Incoming | ✅ | ✅ | ✅ | ❌ |
| Supplier (Partner) | ❌ | ✅ | ❌ | ❌ |
| Products | ❌ | ✅ | ❌ | ❌ |
| Quality Checks (incoming) | ❌ | ✅ | ✅ (fill result) | ❌ |

**Menus visible:** Inventory > Receipts, Purchase > Orders (read-only)
**Redirect on login:** Incoming receipts list

---

#### Sales Coordinator (Role 14)
| Object | Create | Read | Write | Delete |
|---|---|---|---|---|
| Sales Order | ❌ | ✅ | ❌ | ❌ |
| Delivery Status | ❌ | ✅ | ❌ | ❌ |
| Customer (Partner) | ❌ | ✅ | ❌ | ❌ |
| Products | ❌ | ✅ | ❌ | ❌ |
| Invoices | ❌ | ✅ | ❌ | ❌ |

**Menus visible:** Sales > Orders, Delivery status (read-only)
**Redirect on login:** Sales orders list

---

#### Finance Viewer (Role 15)
| Object | Create | Read | Write | Delete |
|---|---|---|---|---|
| Invoices | ❌ | ✅ | ❌ | ❌ |
| Bills | ❌ | ✅ | ❌ | ❌ |
| Products (cost/price) | ❌ | ✅ | ❌ | ❌ |
| Margins (custom) | ❌ | ✅ | ❌ | ❌ |
| Stock Valuation | ❌ | ✅ | ❌ | ❌ |

**Menus visible:** Accounting > Invoices, Bills (read-only), Inventory > Valuation
**Redirect on login:** Finance overview (read-only)

---

## 4. Technical Implementation Plan

### Phase 1 — Custom Module Foundation
- [ ] Create module `warehouse_access_control`
- [ ] Define all 15 security groups in `security/groups.xml`
- [ ] Ensure groups do NOT inherit `base.group_user` (no license count)
- [ ] Create `ir.model.access.csv` for all model-level permissions
- [ ] Create record rules for row-level restrictions (own records, assigned orders)

### Phase 2 — Menu Customization
- [ ] Create role-specific menu items with group visibility
- [ ] Hide all irrelevant menus per role
- [ ] Custom login redirect per group (home action)

### Phase 3 — Custom Models (Skid Management)
- [ ] `warehouse.skid` model (Skid ID, order, weight, location, status)
- [ ] `warehouse.skid.line` model (product, quantity per skid)
- [ ] Skid barcode generation
- [ ] Weight capture field
- [ ] Status workflow: Released → Picking → Picked → Checking → Checked → Dispatched

### Phase 4 — Inventory Enhancements
- [ ] Add margin & margin % computed fields to product
- [ ] Add on-order quantity field visibility
- [ ] Main category / sub-category fields
- [ ] Sortable/filterable columns in inventory list view

### Phase 5 — Quality Module Customization
- [ ] Quality control point configuration per role
- [ ] CAPA workflow: New → In Progress → Resolved → Closed
- [ ] Block stock move if quality check fails
- [ ] Quality KPI dashboard

### Phase 6 — Picking Process Workflow
- [ ] Location-sorted pick ticket (aisle → rack → bin)
- [ ] Picker confirmation (first-level approval)
- [ ] Checker confirmation (second-level approval)
- [ ] Delivery note with skid details, weights, totals
- [ ] Full audit trail (picker + checker + timestamps)

### Phase 7 — Reporting & Dashboards
- [ ] Per-role landing dashboard
- [ ] Quality KPIs (pass/fail rates, alerts, supplier performance)
- [ ] Warehouse KPIs (pick accuracy, throughput, dispatch status)
- [ ] Manufacturing KPIs (OEE, lead time, cost)
- [ ] Export to Excel/PDF

### Phase 8 — Mobile / Barcode Interface
- [ ] Configure Odoo Barcode app for Picker role
- [ ] Configure Odoo Barcode app for Checker role
- [ ] Configure Manufacturing tablet view for Shop Floor Operator
- [ ] Test with RF scanner

---

## 5. Custom Models Summary

| Model | Purpose |
|---|---|
| `warehouse.skid` | Skid tracking (ID, weight, location, status) |
| `warehouse.skid.line` | Products per skid |
| `quality.control.point` | Extended (already in Odoo, customized) |
| `quality.capa` | Corrective & preventive actions |
| `res.partner.quality` | Supplier quality evaluation |

---

## 6. File Structure

```
warehouse_access_control/
├── __manifest__.py
├── __init__.py
├── models/
│   ├── __init__.py
│   ├── warehouse_skid.py
│   ├── product_margin.py
│   └── quality_capa.py
├── security/
│   ├── groups.xml
│   ├── record_rules.xml
│   └── ir.model.access.csv
├── views/
│   ├── menus.xml
│   ├── warehouse_skid_views.xml
│   ├── product_views.xml
│   └── quality_views.xml
├── data/
│   └── home_actions.xml
└── PLAN.md
```

---

## 7. Build Order

| Step | Task | Phase |
|---|---|---|
| 1 | Module scaffold + groups | 1 |
| 2 | Access rights CSV + record rules | 1 |
| 3 | Menu restrictions per role | 2 |
| 4 | Login redirect per role | 2 |
| 5 | Skid model + views | 3 |
| 6 | Inventory margin fields | 4 |
| 7 | Quality workflow customization | 5 |
| 8 | Picking workflow + approvals | 6 |
| 9 | Dashboards per role | 7 |
| 10 | Barcode/mobile config | 8 |

---

*Document prepared for client review before development start.*

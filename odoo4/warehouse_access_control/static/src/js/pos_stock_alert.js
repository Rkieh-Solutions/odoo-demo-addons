/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { PosStore } from "@point_of_sale/app/services/pos_store";
import { _t } from "@web/core/l10n/translation";
import { AlertDialog } from "@web/core/confirmation_dialog/confirmation_dialog";

patch(PosStore.prototype, {
    async addLineToOrder(vals, order, opts = {}, configure = true) {
        let product = vals.product_id;
        if (!product && vals.product_tmpl_id) {
            if (typeof vals.product_tmpl_id == "number") {
                product = this.data.models["product.template"].get(vals.product_tmpl_id);
            } else {
                product = vals.product_tmpl_id;
            }
        }

        if (product) {
            let qty_available = 0;

            try {
                const response = await fetch("/warehouse_access_control/get_stock", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        jsonrpc: "2.0",
                        method: "call",
                        params: {
                            product_id: product.id,
                            model: product.modelName || "product.product",
                        },
                    }),
                });
                const data = await response.json();
                if (data && data.result) {
                    qty_available = data.result.qty_available || 0;
                }
            } catch (e) {
                console.warn("[WH Stock Alert] fetch error:", e);
            }

            const safe_qty = parseFloat(qty_available) || 0;

            // 🚨 If product stock is <= 0, block the sale and show alert
            if (safe_qty <= 0) {
                await this.dialog.add(AlertDialog, {
                    title: _t("⚠️ Out of Stock!"),
                    body: _t("Cannot add this product. Quantity is (%s).", safe_qty),
                });
                return;
            }

            // Calculate total quantity of this product already in the order
            const currentOrder = order || this.getOrder();
            let current_qty_in_order = 0;
            if (currentOrder) {
                const lines = currentOrder.get_orderlines
                    ? currentOrder.get_orderlines()
                    : currentOrder.lines || [];
                if (lines && typeof lines.forEach === "function") {
                    lines.forEach((l) => {
                        const p =
                            l.product ||
                            l.product_id ||
                            (l.get_product ? l.get_product() : null);
                        if (
                            p &&
                            (p.id === product.id ||
                                p.display_name === product.display_name)
                        ) {
                            let q = 1;
                            if (typeof l.getQuantity === "function") q = l.getQuantity();
                            else if (typeof l.get_quantity === "function")
                                q = l.get_quantity();
                            else if (l.qty !== undefined) q = l.qty;
                            current_qty_in_order += parseFloat(q) || 0;
                        }
                    });
                }
            }

            const new_total_qty = parseFloat(current_qty_in_order) + parseFloat(vals.qty || 1);
            const remaining_qty = safe_qty - new_total_qty;

            if (remaining_qty < 0) {
                await this.dialog.add(AlertDialog, {
                    title: _t("⚠️ Stock Exceeded!"),
                    body: _t(
                        "Cannot add more units. You already have %s in your cart, and only %s are available.",
                        current_qty_in_order,
                        safe_qty
                    ),
                });
                return;
            } else if (remaining_qty === 0) {
                await this.dialog.add(AlertDialog, {
                    title: _t("⚠️ Last Unit!"),
                    body: _t(
                        "You have added the last available unit(s). The product (%s) is now out of stock.",
                        product.display_name
                    ),
                });
            }
        }

        return await super.addLineToOrder(...arguments);
    },
});

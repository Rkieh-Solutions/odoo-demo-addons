/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { PosStore } from "@point_of_sale/app/services/pos_store";
import { _t } from "@web/core/l10n/translation";
import { AlertDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { ProductProduct } from "@point_of_sale/app/models/product_product";
import { ProductTemplate } from "@point_of_sale/app/models/product_template";

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
            let threshold = 0;

            console.log("[POS Stock Alert] Checking stock for product:", product.display_name);

            try {
                const response = await fetch("/pos_stock_alert/get_stock", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        jsonrpc: "2.0",
                        method: "call",
                        params: { product_id: product.id },
                    }),
                });
                const data = await response.json();
                if (data && data.result && data.result.success) {
                    const result = data.result;
                    if (result.is_storable === false) {
                        return await super.addLineToOrder(...arguments);
                    }
                    qty_available = parseFloat(result.qty_available) || 0;
                    threshold = parseFloat(result.x_qty_to_warn) || 0;
                }
            } catch (e) {
                console.warn("[POS Stock Alert] fetch error:", e);
                return await super.addLineToOrder(...arguments);
            }

            if (!threshold) {
                threshold = (this.config && this.config.x_global_stock_warn_threshold) || 0;
            }

            // Calculate total quantity of this product already in the order
            const currentOrder = order || this.getOrder();
            let current_qty_in_order = 0;
            if (currentOrder && currentOrder.lines) {
                const existingLines = currentOrder.lines.filter(l => l.product_id && l.product_id.id === product.id);
                current_qty_in_order = existingLines.reduce((sum, l) => sum + (l.getQuantity() || 0), 0);
            }

            const new_total_qty = current_qty_in_order + (vals.qty || 1);

            console.log("[POS Stock Alert] qty_available:", qty_available, "current_in_order:", current_qty_in_order, "new_total:", new_total_qty);

            if (new_total_qty > qty_available) {
                await this.dialog.add(AlertDialog, {
                    title: _t("CRITICAL: Stock Exceeded!"),
                    body: _t("You are trying to add %s units of '%s', but only %s units are available in stock. Order current quantity for this item: %s.",
                        (vals.qty || 1), product.display_name, qty_available, current_qty_in_order),
                });
                return;
            } else if (qty_available <= 0) {
                await this.dialog.add(AlertDialog, {
                    title: _t("CRITICAL: Out of Stock!"),
                    body: _t("The product (%s) is completely out of stock.", product.display_name),
                });
                return;
            } else if (threshold > 0 && qty_available <= threshold) {
                await this.dialog.add(AlertDialog, {
                    title: _t("Low Stock Warning"),
                    body: _t("Warning: Remaining quantity for '%s' is low (%s).", product.display_name, qty_available),
                });
            }
        }

        return await super.addLineToOrder(...arguments);
    },
});

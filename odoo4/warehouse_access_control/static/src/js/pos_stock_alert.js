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
            let threshold = 0;
            let debugInfo = "no response";

            console.log("[POS Stock Alert] Checking product:", product);
            console.log("[POS Stock Alert] Product database ID:", product.id);
            console.log("[POS Stock Alert] Product name:", product.display_name);

            const productModel = product.modelName || (product._model ? product._model.name : (product.constructor.modelName || 'product.product'));
            console.log("[POS Stock Alert] modelName identified:", productModel);

            try {
                const response = await fetch("/warehouse_access_control/get_stock", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        jsonrpc: "2.0",
                        method: "call",
                        params: {
                            product_id: product.id,
                            product_name: product.display_name,
                            model: productModel,
                            config_id: (this.config && this.config.id) || this.config_id || null,
                        },
                    }),
                });
                console.log("[POS Stock Alert] Fetching stock for product=" + product.id + ", config_id=" + ((this.config && this.config.id) || this.config_id));
                const data = await response.json();
                if (data && data.result) {
                    qty_available = data.result.qty_available || 0;
                    threshold = data.result.x_qty_to_warn || 0;
                    debugInfo = data.result.debug || "no debug";
                }
            } catch (e) {
                console.warn("[POS Stock Alert] fetch error:", e);
                debugInfo = "fetch failed: " + e.message;
            }

            if (!threshold) {
                threshold = (this.config && this.config.x_global_stock_warn_threshold) || 0;
            }

            console.log("[POS Stock Alert] " + product.display_name + " (JS id=" + product.id + "): qty=" + qty_available + ", threshold=" + threshold + ", debug=" + debugInfo);

            // Calculate total quantity of this product already in the order
            const currentOrder = order || this.getOrder();
            let current_qty_in_order = 0;
            if (currentOrder) {
                const lines = currentOrder.get_orderlines ? currentOrder.get_orderlines() : (currentOrder.lines || []);
                if (lines && typeof lines.forEach === 'function') {
                    lines.forEach(l => {
                        const p = l.product || l.product_id || (l.get_product ? l.get_product() : null);
                        if (p && (p.id === product.id || p.display_name === product.display_name)) {
                            let q = 1;
                            if (typeof l.getQuantity === "function") q = l.getQuantity();
                            else if (typeof l.get_quantity === "function") q = l.get_quantity();
                            else if (l.qty !== undefined) q = l.qty;

                            current_qty_in_order += parseFloat(q) || 0;
                        }
                    });
                }
            }

            if (threshold <= 0) {
                threshold = 100; // Hard fallback so the warning ALWAYS appears for testing
            }

            const new_total_qty = parseFloat(current_qty_in_order) + parseFloat(vals.qty || 1);
            const safe_qty_available = parseFloat(qty_available) || 0;
            const remaining_qty = safe_qty_available - new_total_qty;

            console.log("[POS Stock Alert] safe_qty_available:", safe_qty_available, "new_total:", new_total_qty, "remaining:", remaining_qty, "threshold:", threshold);

            // 🚨 PRIMARY CHECK: Product is already out of stock (qty <= 0)
            if (safe_qty_available <= 0) {
                await this.dialog.add(AlertDialog, {
                    title: _t("⚠️ Out of Stock!"),
                    body: _t("Cannot add this product. Quantity is (%s).", safe_qty_available),
                });
                return;
            }

            if (remaining_qty < 0) {
                // Blocks the sale because we exceed the stock
                await this.dialog.add(AlertDialog, {
                    title: _t("CRITICAL: Stock Exceeded!"),
                    body: _t("Cannot add more units. You already have %s in your cart, and only %s are available total.", current_qty_in_order, safe_qty_available),
                });
                return;
            } else if (remaining_qty === 0) {
                // Allows the sale, but alerts that it's the absolute last one
                await this.dialog.add(AlertDialog, {
                    title: _t("CRITICAL: Out of Stock!"),
                    body: _t("You have added the last available unit(s). The product (%s) is now completely out of stock.", product.display_name),
                });
            } else if (remaining_qty <= threshold) {
                // Warning for low stock countdown
                await this.dialog.add(AlertDialog, {
                    title: _t("Low Stock Warning"),
                    body: _t("Warning: Remaining quantity is low (%s).", remaining_qty),
                });
            }
        }

        return await super.addLineToOrder(...arguments);
    },
});

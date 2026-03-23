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
                const response = await fetch("/pos_stock_alert/get_stock", {
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
            if (currentOrder && currentOrder.lines) {
                const existingLines = currentOrder.lines.filter(l => l.product_id && l.product_id.id === product.id);
                current_qty_in_order = existingLines.reduce((sum, l) => sum + parseFloat(l.getQuantity() || 0), 0);
            }

            const new_total_qty = parseFloat(current_qty_in_order) + parseFloat(vals.qty || 1);
            const safe_qty_available = parseFloat(qty_available) || 0;

            console.log("[POS Stock Alert] safe_qty_available:", safe_qty_available, "current_in_order:", current_qty_in_order, "new_total:", new_total_qty);

            if (new_total_qty > safe_qty_available) {
                await this.dialog.add(AlertDialog, {
                    title: _t("CRITICAL: Stock Exceeded!"),
                    body: _t("You are trying to add %s units of '%s', but only %s units are available in stock. Total order quantity for this item would be: %s.",
                        parseFloat(vals.qty || 1), product.display_name, safe_qty_available, new_total_qty),
                });
                return;
            } else if (safe_qty_available <= 0) {
                await this.dialog.add(AlertDialog, {
                    title: _t("CRITICAL: Out of Stock!"),
                    body: _t("The product (%s) is completely out of stock; you cannot sell this product.", product.display_name),
                });
                return;
            } else if (threshold > 0 && qty_available <= threshold) {
                await this.dialog.add(AlertDialog, {
                    title: _t("Low Stock Warning"),
                    body: _t("Warning: Remaining quantity is low (%s).", qty_available),
                });
            }
        }

        return await super.addLineToOrder(...arguments);
    },
});

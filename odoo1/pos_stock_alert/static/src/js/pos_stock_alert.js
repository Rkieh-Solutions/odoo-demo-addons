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

            console.log("[POS Stock Alert] Product: " + product.display_name + " (ID: " + product.id + ")");
            console.log("[POS Stock Alert] Fetching stock from server...");
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
                if (data && data.result) {
                    qty_available = parseFloat(data.result.qty_available) || 0;
                    threshold = parseFloat(data.result.x_qty_to_warn) || 0;
                    debugInfo = data.result.debug || "no debug";
                    console.log("[POS Stock Alert] Received: qty=" + qty_available + ", threshold=" + threshold + ", debug=" + debugInfo);
                }
            } catch (e) {
                console.warn("[POS Stock Alert] Fetch error:", e);
                debugInfo = "fetch failed: " + e.message;
            }

            if (!threshold) {
                threshold = (this.config && this.config.x_global_stock_warn_threshold) || 0;
            }

            console.log("[POS Stock Alert] " + product.display_name + " (JS id=" + product.id + "): qty=" + qty_available + ", threshold=" + threshold + ", debug=" + debugInfo);

            if (qty_available <= 0) {
                await this.dialog.add(AlertDialog, {
                    title: _t("CRITICAL: Out of Stock!"),
                    body: _t("the product (%s) is completly out of stock you can cannot sold this product", product.display_name),
                });
                return;
            } else if (threshold > 0 && qty_available <= threshold) {
                await this.dialog.add(AlertDialog, {
                    title: _t("Low Stock Warning"),
                    body: _t("warning  Quantity is low %s", qty_available),
                });
            }
        }

        return await super.addLineToOrder(...arguments);
    },
});

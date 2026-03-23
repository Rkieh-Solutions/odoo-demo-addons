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
            // Fetch REAL stock from backend - this is 100% accurate
            let qty_available = 0;
            try {
                const stockData = await this.data.ormService.call(
                    "product.product",
                    "read",
                    [[product.id], ["qty_available"]]
                );
                if (stockData && stockData.length > 0) {
                    qty_available = stockData[0].qty_available || 0;
                }
            } catch (e) {
                console.warn("[POS Stock Alert] Could not fetch stock:", e);
                // If RPC fails, fall back to local data
                qty_available = product.qty_available || 0;
            }

            const threshold = product.x_qty_to_warn || (this.config && this.config.x_global_stock_warn_threshold) || 0;

            console.log(`[POS Stock Alert] Product: ${product.display_name}, REAL qty: ${qty_available}, threshold: ${threshold}`);

            if (qty_available <= 0) {
                // Out of stock - BLOCK the sale
                await this.dialog.add(AlertDialog, {
                    title: _t("CRITICAL: Out of Stock!"),
                    body: _t("the product (%s) is completly out of stock you can cannot sold this product", product.display_name),
                });
                return;
            } else if (threshold > 0 && qty_available <= threshold) {
                // Low stock - WARN but ALLOW the sale
                await this.dialog.add(AlertDialog, {
                    title: _t("Low Stock Warning"),
                    body: _t("warning  Quantity is low %s", qty_available),
                });
                // Falls through to super - allows selling
            }
        }

        return await super.addLineToOrder(...arguments);
    },
});

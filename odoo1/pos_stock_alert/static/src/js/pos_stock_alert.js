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
            // DEEP DEBUG: Log the entire vals object to see why the name might be wrong
            console.log("[POS Stock Alert] addLineToOrder vals:", vals);

            // Ensure we have the most up-to-date product data from the store
            const product_id = typeof product === 'object' ? product.id : product;
            const store_product = this.data.models["product.product"].get(product_id);
            const final_product = store_product || (typeof product === 'object' ? product : null);

            if (!final_product) {
                console.warn("[POS Stock Alert] Could not resolve final_product for ID:", product_id);
                return await super.addLineToOrder(...arguments);
            }

            console.log(`[POS Stock Alert] Checking: ${final_product.display_name} (ID: ${final_product.id}), Qty: ${final_product.qty_available}, Warn: ${final_product.x_qty_to_warn}`);

            const qty_available = final_product.qty_available || 0;
            // Use product specific threshold first, then global threshold from pos.config
            const threshold = final_product.x_qty_to_warn || (this.config && this.config.x_global_stock_warn_threshold) || 0;

            if (qty_available <= 0) {
                await this.dialog.add(AlertDialog, {
                    title: _t("CRITICAL: Out of Stock!"),
                    body: _t("the product (%s) is completly out of stock you can cannot sold this product", final_product.display_name),
                });
                return; // Abort adding the line
            } else if (qty_available <= threshold) {
                await this.dialog.add(AlertDialog, {
                    title: _t("LOW STOCK ALERT (Allow Sell)"),
                    body: _t("Warning Still there is only %s quantity of %s. You can still sell this product.", qty_available, final_product.display_name),
                });
                // NO return here - allows selling
            }
        }

        return await super.addLineToOrder(...arguments);
    },
});

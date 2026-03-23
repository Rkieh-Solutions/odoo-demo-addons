/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { PosStore } from "@point_of_sale/app/services/pos_store";
import { _t } from "@web/core/l10n/translation";
import { AlertDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { rpc } from "@web/core/network/rpc";

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
            // Fetch REAL stock from our dedicated backend endpoint
            let qty_available = 0;
            let threshold = 0;
            try {
                const result = await rpc("/pos_stock_alert/get_stock", {
                    product_id: product.id,
                });
                qty_available = result.qty_available || 0;
                threshold = result.x_qty_to_warn || 0;
            } catch (e) {
                console.warn("[POS Stock Alert] RPC failed:", e);
                qty_available = product.qty_available || 0;
                threshold = product.x_qty_to_warn || 0;
            }

            // Fallback to global threshold if product has none
            if (!threshold) {
                threshold = (this.config && this.config.x_global_stock_warn_threshold) || 0;
            }

            console.log(`[POS Stock Alert] ${product.display_name}: qty=${qty_available}, threshold=${threshold}`);

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

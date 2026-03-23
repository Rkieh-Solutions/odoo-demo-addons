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
            // Requirement: add to allow some product not related to this warning
            if (product.x_no_stock_warning) {
                return await super.addLineToOrder(...arguments);
            }

            const qty_available = product.qty_available || 0;
            // Use product specific threshold first, then global threshold from pos.config
            const threshold = product.x_qty_to_warn || (this.config && this.config.x_global_stock_warn_threshold) || 0;

            if (qty_available <= 0) {
                await this.dialog.add(AlertDialog, {
                    title: _t("Warning: Out of Stock!"),
                    body: _t("the product (%s) is completly out of stock you can cannot sold this product", product.display_name),
                });
                return; // Abort adding the line
            } else if (qty_available <= threshold) {
                await this.dialog.add(AlertDialog, {
                    title: _t("Low Stock Warning"),
                    body: _t("Warning Still there is only %s quantity of %s", qty_available, product.display_name),
                });
            }
        }

        return await super.addLineToOrder(...arguments);
    },
});

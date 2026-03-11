/** @odoo-module */
import { PosStore } from "@point_of_sale/app/services/pos_store";
import { patch } from "@web/core/utils/patch";
import { AlertDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { _t } from "@web/core/l10n/translation";

patch(PosStore.prototype, {
    async addLineToOrder(vals, order) {
        let product = vals.product_id;
        if (product && (product.qty_available || 0) <= 0) {
            await this.dialog.add(AlertDialog, {
                title: _t("Warning: Out of Stock!"),
                body: _t("Waring :the product (%s) is out of stock , \nThe requested quantity is not available in inventory", product.display_name),
            });
        }
        return await super.addLineToOrder(...arguments);
    }
});

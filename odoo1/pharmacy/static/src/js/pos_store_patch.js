/** @odoo-module */
import { PosStore } from "@point_of_sale/app/services/pos_store";
import { patch } from "@web/core/utils/patch";
import { AlertDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { _t } from "@web/core/l10n/translation";

patch(PosStore.prototype, {
    async addLineToOrder(product, options) {
        const qty = product.qty_available || 0;
        if (product && qty < 0) {
            const productName = product.display_name || product.name || _t("Product");
            this.env.services.dialog.add(AlertDialog, {
                title: _t("Warning: Out of Stock!"),
                body: _t("Waring :the product (%s) is out of stock , The requested quantity is not available in inventory", productName),
            });
        }
        return await super.addLineToOrder(...arguments);
    }
});

/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { PosStore } from "@point_of_sale/app/store/pos_store";
import { _t } from "@web/core/l10n/translation";
import { ErrorPopup } from "@point_of_sale/app/errors/popups/error_popup";

patch(PosStore.prototype, {
    async addProductToCurrentOrder(product, options = {}) {
        // Find the quantity available. Note: product.qty_available might depend on POS stock configuration
        const qty_available = product.qty_available || 0;
        const qty_to_warn = product.x_qty_to_warn || 0;

        // Requirement: IF QUANTITY IS 0 IN POS NO PRODUCT CAN BE SEEL AND ALERT WILL APPEAR : CANOT SELL THIS PRODUCT ,QUANTITY IS LESS 0
        if (qty_available <= 0) {
            this.popup.add(ErrorPopup, {
                title: _t("Warning: Out of Stock!"),
                body: _t("the product (%s) is completly out of stock you can cannot sold this product", product.display_name),
            });
            return;
        }

        // Requirement: IF I HAVE AN PRODUCT THAT HAVE 10 AND I PUT ON MY NEW FEILD 5 THATS MEAN WHEN QAUANTITY OF PRODUCT IS 5 WILL GIVE AN ALERT N POS
        // Note: We check if the current quantity is less than or equal to the warning threshold.
        if (qty_available <= qty_to_warn) {
            this.env.services.notification.add(
                _t("Low Stock Warning: %s (Available: %s)", product.display_name, qty_available),
                {
                    type: "danger",
                    title: _t("Stock Alert"),
                    sticky: false
                }
            );
        }

        return super.addProductToCurrentOrder(...arguments);
    },
});

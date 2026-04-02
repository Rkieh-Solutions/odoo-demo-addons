/** @odoo-module */

import OrderPaymentValidation from "@point_of_sale/app/utils/order_payment_validation";
import { patch } from "@web/core/utils/patch";
import { _t } from "@web/core/l10n/translation";
import { AlertDialog } from "@web/core/confirmation_dialog/confirmation_dialog";

patch(OrderPaymentValidation.prototype, {
    async isOrderValid(isForceValidate) {
        // Prevent double alert if isForceValidate is true (e.g. from large amount confirm)
        if (!isForceValidate) {
            const overStockLines = this.order.lines.filter(line => {
                const qty_available = line.product_id.qty_available || 0;
                return (line.getQuantity() > qty_available) || (qty_available <= 0);
            });

            if (overStockLines.length > 0) {
                const line = overStockLines[0];
                const stock = line.product_id.qty_available || 0;

                this.pos.env.services.dialog.add(AlertDialog, {
                    title: _t("Warning: Out of Stock!"),
                    body: `LOW QUANTITY QUANTITY IS (${stock})`
                });

                return false;
            }
        }
        return await super.isOrderValid(...arguments);
    }
});

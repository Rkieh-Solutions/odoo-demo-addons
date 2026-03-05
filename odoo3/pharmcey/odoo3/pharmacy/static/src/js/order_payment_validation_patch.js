/** @odoo-module */

import OrderPaymentValidation from "@point_of_sale/app/utils/order_payment_validation";
import { patch } from "@web/core/utils/patch";
import { _t } from "@web/core/l10n/translation";
import { ask } from "@point_of_sale/app/utils/make_awaitable_dialog";

patch(OrderPaymentValidation.prototype, {
    async isOrderValid(isForceValidate) {
        // Prevent double alert if isForceValidate is true (e.g. from large amount confirm)
        if (!isForceValidate) {
            const overStockLines = this.order.lines.filter(line => {
                const qty_available = line.product_id.qty_available || 0;
                return (line.getQuantity() > qty_available) || (qty_available <= 0);
            });

            if (overStockLines.length > 0) {
                const productList = overStockLines.map(line => {
                    const stock = line.product_id.qty_available || 0;
                    return `${line.product_id.display_name} (Stock: ${stock}, In Cart: ${line.getQuantity()})`;
                }).join(", ");

                const confirmed = await ask(this.pos.dialog, {
                    title: _t("Out of Stock Warning"),
                    body: _t(
                        "The following products have insufficient stock: %s.\nAre you sure you want to validate this order?",
                        productList
                    ),
                });
                if (!confirmed) {
                    return false;
                }
            }
        }
        return await super.isOrderValid(...arguments);
    }
});

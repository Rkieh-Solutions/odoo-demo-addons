/** @odoo-module */
console.log("Pharmacy Management: Loading pos_store_patch.js");

import { PosStore } from "@point_of_sale/app/services/pos_store";
import { patch } from "@web/core/utils/patch";
import { _t } from "@web/core/l10n/translation";
import { AlertDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { ask } from "@point_of_sale/app/utils/make_awaitable_dialog";

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
            const qty_available = product.qty_available || 0;
            const currentOrder = order || this.getOrder();
            let qty_in_cart = 0;
            if (currentOrder) {
                const existingLines = currentOrder.lines.filter(l => l.product_id.id === product.id);
                qty_in_cart = existingLines.reduce((sum, l) => sum + (l.getQuantity() || 0), 0);
            }
            const new_qty = vals.qty || 1;
            const total_planned_qty = qty_in_cart + new_qty;

            if (qty_available <= 0 || total_planned_qty > qty_available) {
                await this.dialog.add(AlertDialog, {
                    title: _t("Out of Stock Warning"),
                    body: _t("The product '%s' has limited quantity in stock (On Hand: %s). Your cart now has %s. Do you want to continue?",
                        product.display_name, qty_available, total_planned_qty),
                });
            }
        }

        return await super.addLineToOrder(...arguments);
    },

    async pay() {
        const currentOrder = this.getOrder();
        if (currentOrder) {
            const overStockLines = currentOrder.lines.filter(line => {
                const qty_available = line.product_id.qty_available || 0;
                return (line.getQuantity() > qty_available) || (qty_available <= 0);
            });

            if (overStockLines.length > 0) {
                const productList = overStockLines.map(line => {
                    const stock = line.product_id.qty_available || 0;
                    return `${line.product_id.display_name} (Stock: ${stock}, In Cart: ${line.getQuantity()})`;
                }).join(", ");

                const confirmed = await ask(this.dialog, {
                    title: _t("Out of Stock Warning"),
                    body: _t(
                        "The following products have insufficient stock or are out of stock: %s.\nDo you want to continue to payment?",
                        productList
                    ),
                });
                if (!confirmed) {
                    return;
                }
            }
        }
        return await super.pay(...arguments);
    }
});

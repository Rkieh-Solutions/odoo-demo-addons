import { Component, useState, onRendered, useRef } from "@odoo/owl";
import { patch } from "@web/core/utils/patch";
import { ControlButtons } from "@point_of_sale/app/screens/product_screen/control_buttons/control_buttons";
import { useService } from "@web/core/utils/hooks";
import { CreateChildProductPopup } from "@pharmacy/pos/create_child_product_popup/create_child_product_popup";
import { SubstanceSearchPopup } from "@pharmacy/pos/substance_search_popup/substance_search_popup";
import { AlertDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { _t } from "@web/core/l10n/translation";

patch(ControlButtons.prototype, {
    setup() {
        super.setup();
        this.orm = useService("orm");
        this.notification = useService("notification");
        this.dialog = useService("dialog");
    },
    async onClickOpenBox() {
        const order = this.pos.getOrder();
        const line = order ? order.getSelectedOrderline() : null;
        if (!line || !line.product_id) return;

        const product = line.product_id;
        const qty = product.qty_available || 0;

        if (qty < 0) {
            const productName = product.display_name || product.name || _t("Product");
            await this.dialog.add(AlertDialog, {
                title: _t("Warning: Out of Stock!"),
                body: _t("Waring :the product (%s) is out of stock , \nThe requested quantity is not available in inventory", productName),
            });
            // Not returning - user might want to open box even if stock is negative? 
            // Usually negative stock means they already sold more than they had.
            // I'll return to be safe, as requested "give an alert message".
            return;
        }

        if (!product.envelope_child_id) {
            this.dialog.add(CreateChildProductPopup, {
                title: _t("Create Child Product"),
                body: _t("Product %s has no child. Create one?", product.display_name),
                confirm: async (name) => {
                    const templateId = product.product_tmpl_id.id || product.product_tmpl_id;
                    const orm = this.orm;
                    const notification = this.notification;
                    await orm.call("product.template", "action_create_child_and_open", [[templateId], name]);
                    notification.add(_t("Child created and box opened."), { type: "success" });
                }
            });
            return;
        }

        const templateId = product.product_tmpl_id.id || product.product_tmpl_id;
        await this.orm.call("product.template", "action_open_new_box", [[templateId]]);
        this.notification.add(_t("Box opened."), { type: "success" });
    },
    async onClickFindSubstitutes() {
        this.dialog.add(SubstanceSearchPopup, {
            title: _t("Find Substitutes by Ingredient"),
        });
    }
});

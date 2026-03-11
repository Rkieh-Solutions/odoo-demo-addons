/** @odoo-module */
import { Component, useState, onRendered, useRef } from "@odoo/owl";
import { patch } from "@web/core/utils/patch";
import { ControlButtons } from "@point_of_sale/app/screens/product_screen/control_buttons/control_buttons";
import { useService } from "@web/core/utils/hooks";
import { usePos } from "@point_of_sale/app/hooks/pos_hook";
import { CreateChildProductPopup } from "@pharmacy/pos/create_child_product_popup/create_child_product_popup";
import { SubstanceSearchPopup } from "@pharmacy/pos/substance_search_popup/substance_search_popup";
import { AlertDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { _t } from "@web/core/l10n/translation";

patch(ControlButtons.prototype, {
    setup() {
        super.setup();
        this.pos = usePos();
        this.orm = useService("orm");
        this.notification = useService("notification");
        this.dialog = useService("dialog");
    },
    _getOrder() {
        const pos = this.pos || this.env.services.pos;
        if (!pos) return null;
        if (typeof pos.get_order === "function") return pos.get_order();
        if (typeof pos.getOrder === "function") return pos.getOrder();
        if (pos.get_order) return pos.get_order;
        if (pos.getOrder) return pos.getOrder;
        return null;
    },
    _getSelectedLine(order) {
        if (!order) return null;
        if (typeof order.get_selected_orderline === "function") return order.get_selected_orderline();
        if (typeof order.getSelectedOrderline === "function") return order.getSelectedOrderline();
        if (order.get_selected_orderline) return order.get_selected_orderline;
        if (order.getSelectedOrderline) return order.getSelectedOrderline;
        return null;
    },
    async onClickOpenBox() {
        const order = this._getOrder();
        const line = this._getSelectedLine(order);
        if (!line || !line.product) return;

        const product = line.product;
        const qty = product.qty_available || 0;
        const templateId = product.product_tmpl_id.id || product.product_tmpl_id;

        if (!product.envelope_child_id) {
            this.env.services.dialog.add(CreateChildProductPopup, {
                title: _t("📦 Open Box: Create Child Product"),
                body: _t("This product has no child. Create one?"),
                confirm: async (name) => {
                    const orm = this.env.services.orm;
                    const notification = this.env.services.notification;
                    try {
                        await orm.call("product.template", "action_create_child_and_open", [[templateId], name]);
                        notification.add(_t("Child created and box opened."), { type: "success" });
                    } catch (err) {
                        notification.add(_t("Error creating child."), { type: "danger" });
                    }
                }
            });
            return;
        }

        if (qty <= 0) {
            const productName = product.display_name || product.name || _t("Product");
            await this.env.services.dialog.add(AlertDialog, {
                title: _t("Warning: Out of Stock!"),
                body: _t("Waring :the product (%s) is out of stock ,\nThe requested quantity is not available in inventory", productName),
            });
            return;
        }

        await this.env.services.orm.call("product.template", "action_open_new_box", [[templateId]]);
        this.env.services.notification.add(_t("Box opened."), { type: "success" });
    },
    async onClickFindSubstitutes() {
        this.env.services.dialog.add(SubstanceSearchPopup, {
            title: _t("Find Substitutes by Ingredient"),
        });
    }
});

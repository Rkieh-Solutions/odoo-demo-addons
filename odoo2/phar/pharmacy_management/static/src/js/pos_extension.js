/** @odoo-module */

import { patch } from "@web/core/utils/patch";
import { ControlButtons } from "@point_of_sale/app/screens/product_screen/control_buttons/control_buttons";
import { useService } from "@web/core/utils/hooks";
import { SubstanceSearchPopup } from "@pharmacy_management/js/SubstanceSearchPopup";
import { _t } from "@web/core/l10n/translation";

console.log("Pharmacy Management: Loading pos_extension.js");
alert("Pharmacy Management JS IS LOADING!!!");

// Add "Open Box" and "Find Substitutes" handlers to the ControlButtons (Actions popup)
patch(ControlButtons.prototype, {
    setup() {
        super.setup();
        this.orm = useService("orm");
        this.notification = useService("notification");
        this.dialog = useService("dialog");
    },
    async onClickOpenBox() {
        alert("Open Box clicked!");
        console.log("Pharmacy Management: onClickOpenBox called");
        const order = this.pos.getOrder();
        const selectedLine = order ? order.getSelectedOrderline() : null;

        if (!selectedLine || !selectedLine.product_id) {
            this.notification.add(_t("Please select a product line first."), { type: "warning" });
            return;
        }

        const product = selectedLine.product_id;
        let parentTmplId = product.product_tmpl_id;
        if (typeof parentTmplId === 'object') parentTmplId = parentTmplId.id;

        if (!parentTmplId) {
            this.notification.add(_t("Template ID not found for this product."), { type: "warning" });
            return;
        }

        try {
            await this.orm.call("product.template", "action_open_new_box", [parentTmplId]);
            this.notification.add(_t("📦 Box opened! Stock updated."), { type: "success" });
            if (this.props.close) this.props.close();
        } catch (error) {
            console.error("Open Box Error:", error);
            this.notification.add(_t("Failed to open box."), { type: "danger" });
        }
    },
    async onClickFindSubstitutes() {
        alert("Find Substitutes clicked!");
        console.log("Pharmacy Management: onClickFindSubstitutes called");
        this.dialog.add(SubstanceSearchPopup, {
            title: _t("Find Substance / Substitute"),
        });

        if (this.props.close) {
            this.props.close();
        }
    }
});

/** @odoo-module */

import { patch } from "@web/core/utils/patch";
import { ControlButtons } from "@point_of_sale/app/screens/product_screen/control_buttons/control_buttons";
import { useService } from "@web/core/utils/hooks";
import { SubstanceSearchPopup } from "@pharmacy_management/js/SubstanceSearchPopup";
import { _t } from "@web/core/l10n/translation";

// Add "Open Box" and "Find Substitutes" handlers to the ControlButtons (Actions popup)
patch(ControlButtons.prototype, {
    async onClickOpenBox() {
        console.log("Pharmacy Management: onClickOpenBox called");
        const order = this.pos.getOrder();
        const selectedLine = order ? order.getSelectedOrderline() : null;

        if (!selectedLine || !selectedLine.product_id) {
            this.pos.env.services.notification.add(_t("Please select a product line first."), { type: "warning" });
            return;
        }

        const product = selectedLine.product_id;
        let parentTmplId = product.product_tmpl_id;
        if (typeof parentTmplId === 'object') parentTmplId = parentTmplId.id;

        if (!parentTmplId) {
            this.pos.env.services.notification.add(_t("Template ID not found for this product."), { type: "warning" });
            return;
        }

        try {
            await this.pos.env.services.orm.call("product.template", "action_open_new_box", [parentTmplId]);
            this.pos.env.services.notification.add(_t("📦 Box opened! Stock updated."), { type: "success" });
            if (this.props.close) this.props.close();
        } catch (error) {
            console.error("Open Box Error:", error);
            this.pos.env.services.notification.add(_t("Failed to open box."), { type: "danger" });
        }
    },
    async onClickFindSubstitutes() {
        console.log("Pharmacy Management: onClickFindSubstitutes called");
        this.pos.env.services.dialog.add(SubstanceSearchPopup, {
            title: _t("Find Substance / Substitute"),
        });

        if (this.props.close) {
            this.props.close();
        }
    }
});

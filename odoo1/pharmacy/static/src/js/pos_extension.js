/** @odoo-module */

import { patch } from "@web/core/utils/patch";
import { ControlButtons } from "@point_of_sale/app/screens/product_screen/control_buttons/control_buttons";
import { useService } from "@web/core/utils/hooks";
import { SubstanceSearchPopup } from "@pharmacy/pos/substance_search_popup/substance_search_popup";
import { _t } from "@web/core/l10n/translation";

// Add "Open Box" and "Find Substitutes" handlers to the ControlButtons (Actions popup)
patch(ControlButtons.prototype, {
    setup() {
        super.setup();
        this.orm = useService("orm");
        this.notification = useService("notification");
        this.dialog = useService("dialog");
    },
    async onClickOpenBox() {
        const order = this.pos.getOrder();
        const selectedLine = order ? order.getSelectedOrderline() : null;

        if (!selectedLine || !selectedLine.product_id) {
            this.notification.add(_t("Please select a product line first."), { type: "warning" });
            return;
        }

        const product = selectedLine.product_id;
        console.log("Opening Box for Product:", product);

        // Handle different Odoo formats for IDs
        let parentTmplId = product.product_tmpl_id;
        if (Array.isArray(parentTmplId)) {
            parentTmplId = parentTmplId[0];
        } else if (typeof parentTmplId === 'object' && parentTmplId !== null) {
            parentTmplId = parentTmplId.id;
        }

        if (!parentTmplId) {
            console.error("Could not find product template ID in:", product);
            this.notification.add(_t("Product template ID not found. This product might not be correctly loaded in POS."), { type: "danger" });
            return;
        }

        // Try to get lot info if selected
        const lotLines = selectedLine.pack_lot_lines || [];
        const lotName = lotLines.length > 0 ? (lotLines[0].lot_name || lotLines[0].text) : null;

        try {
            const result = await this.orm.call("product.template", "action_open_new_box", [parentTmplId], {
                lot_name: lotName
            });
            if (result && result.params && result.params.type === 'danger') {
                this.notification.add(result.params.message, { type: "danger" });
            } else {
                this.notification.add(_t("📦 Box opened successfully! Stock has been updated."), { type: "success" });
            }
            if (this.props.close) this.props.close();
        } catch (error) {
            console.error("Open Box Error:", error);
            let errMsg = _t("Failed to open box. Please check if the product is correctly configured.");
            if (error && error.data && error.data.message) {
                errMsg += "\nServer says: " + error.data.message;
            } else if (error && error.message) {
                errMsg += "\nError: " + error.message;
            } else {
                try {
                    errMsg += "\nRaw Error: " + JSON.stringify(error);
                } catch (e) { }
            }
            this.notification.add(errMsg, { type: "danger" });
        }
    },
    async onClickFindSubstitutes() {
        // Now using the improved SubstanceSearchPopup from Pharmacy Extension
        this.dialog.add(SubstanceSearchPopup, {
            title: _t("Find Substance / Substitute"),
        });

        if (this.props.close) {
            this.props.close();
        }
    }
});

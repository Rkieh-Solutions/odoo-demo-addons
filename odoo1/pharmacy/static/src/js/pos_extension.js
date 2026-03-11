/** @odoo-module */

import { patch } from "@web/core/utils/patch";
import { ControlButtons } from "@point_of_sale/app/screens/product_screen/control_buttons/control_buttons";
import { useService } from "@web/core/utils/hooks";
import { SubstanceSearchPopup } from "@pharmacy/pos/substance_search_popup/substance_search_popup";
import { _t } from "@web/core/l10n/translation";
import { CreateChildProductPopup } from "@pharmacy/pos/create_child_product_popup/create_child_product_popup";
import { AlertDialog } from "@web/core/confirmation_dialog/confirmation_dialog";

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

        // 1. Check quantity availability
        const qty_available = product.qty_available || 0;
        if (qty_available < 1) {
            await this.dialog.add(AlertDialog, {
                title: _t("Warning: Out of Stock!"),
                body: _t("Warning: the product (%s) is out of stock. The requested quantity is not available in inventory.", product.display_name),
            });
            return;
        }

        let parentTmplId = product.product_tmpl_id;
        if (typeof parentTmplId === 'object') parentTmplId = parentTmplId.id;

        if (!parentTmplId) {
            this.notification.add(_t("Template ID not found for this product."), { type: "warning" });
            return;
        }

        // 2. Check if child product exists
        if (!product.envelope_child_id) {
            this.dialog.add(CreateChildProductPopup, {
                title: _t("Create Child Product"),
                body: _t("The product '%s' does not have a child product configured. Please name the child product to be created (e.g., Envelope, Piece).", product.display_name),
                confirm: async (childName) => {
                    try {
                        const result = await this.orm.call("product.template", "action_create_child_and_open", [parentTmplId, childName]);
                        if (result && result.params && result.params.type === 'danger') {
                            this.notification.add(result.params.message, { type: "danger" });
                        } else {
                            this.notification.add(_t("📦 Child product created and box opened successfully!"), { type: "success" });
                        }
                    } catch (error) {
                        console.error("Create Child & Open Error:", error);
                        this.notification.add(_t("Failed to create child product and open box."), { type: "danger" });
                    }
                }
            });
            if (this.props.close) this.props.close();
            return;
        }

        // 3. Normal Open Box logic
        try {
            const result = await this.orm.call("product.template", "action_open_new_box", [parentTmplId]);
            if (result && result.params && result.params.type === 'danger') {
                this.notification.add(result.params.message, { type: "danger" });
            } else {
                this.notification.add(_t("📦 Box opened successfully! Stock has been updated."), { type: "success" });
            }
            if (this.props.close) this.props.close();
        } catch (error) {
            console.error("Open Box Error:", error);
            this.notification.add(_t("Failed to open box. Please check if the product is correctly configured."), { type: "danger" });
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

/** @odoo-module */

import { Component, useState, onRendered, useRef } from "@odoo/owl";
import { Dialog } from "@web/core/dialog/dialog";
import { usePos } from "@point_of_sale/app/hooks/pos_hook";
import { useService } from "@web/core/utils/hooks";
import { _t } from "@web/core/l10n/translation";

/**
 * SubstanceSearchPopup allows users to search for products by name or substance.
 * It finds alternatives based on shared ingredients (overlap).
 */
export class SubstanceSearchPopup extends Component {
    static template = "pharmacy.SubstanceSearchPopup";
    static components = { Dialog };
    static props = {
        title: { type: String, optional: true },
        close: { type: Function },
    };

    setup() {
        console.log("Pharmacy Extension: SubstanceSearchPopup setup");
        this.pos = usePos();
        this.orm = useService("orm");
        this.notification = useService("notification");
        this.state = useState({
            searchTerm: "",
            products: [], // Will store { product, formatted_price }
            selectedLine: null,
            originalProductName: "",
            isShowingAlternatives: false,
        });
        this.searchInput = useRef("search-input");
        // ... (rest of setup)
    }

    async onOpenBox(product) {
        let parentTmplId = product.product_tmpl_id;
        if (typeof parentTmplId === 'object') parentTmplId = parentTmplId.id;

        try {
            const result = await this.orm.call("product.template", "action_open_new_box", [parentTmplId]);
            if (result && result.params && result.params.type === 'danger') {
                this.notification.add(result.params.message, { type: "danger" });
            } else {
                this.notification.add(_t("📦 Box opened! Stock updated for %s", product.display_name), { type: "success" });
                // Update local stock in POS data to reflect changes
                // Note: In Odoo 17/18, qty_available is part of the product model in POS
                // We'd ideally wait for a sync or manually adjust it here for UI responsiveness
                product.qty_available = (product.qty_available || 0) + (result.params?.qty_added || 0);
            }
        } catch (error) {
            console.error("Open Box Error:", error);
            this.notification.add(_t("Failed to open box."), { type: "danger" });
        }
    }

    async addToOrder(product) {
        // ...
    }

    async replaceLine(product) {
        if (!this.state.selectedLine) return;
        const order = this.pos.getOrder();
        const quantity = this.state.selectedLine.getQuantity();

        order.removeOrderline(this.state.selectedLine);
        this.state.selectedLine = null; // Hide UI elements related to the removed line
        await this.pos.addLineToCurrentOrder({
            product_id: product,
            product_tmpl_id: product.product_tmpl_id,
            qty: quantity
        });

        this.props.close();
    }
}

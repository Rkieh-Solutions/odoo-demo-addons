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

        // Auto-search for alternatives if a product is selected in the cart
        const order = this.pos.getOrder();
        const selectedLine = order?.getSelectedOrderline();
        if (selectedLine && selectedLine.product_id) {
            this.state.selectedLine = selectedLine;
            this.state.originalProductName = selectedLine.product_id.display_name;
            const product = selectedLine.product_id;

            console.log(`Pharmacy Extension: Finding alternatives for ${this.state.originalProductName}`, product.composition);
            this.findAlternatives(product);
        }

        onRendered(() => {
            if (this.searchInput.el && !this.state.isShowingAlternatives) {
                this.searchInput.el.focus();
            }
        });
    }

    /**
     * Finds products that share ingredients with the target product.
     * Matches by "overlap" (at least one common ingredient).
     */
    findAlternatives(product) {
        const allProducts = this.pos.data.models["product.product"];
        const targetComposition = product.composition || [];

        if (targetComposition.length > 0) {
            const matches = allProducts.filter(p => {
                if (p.id === product.id || !p.available_in_pos) return false;
                const pComp = p.composition || [];
                // Intersection check
                return pComp.some(id => targetComposition.includes(id));
            });

            // Sort matches: exact set matches first, then by overlap count
            matches.sort((a, b) => {
                const aComp = a.composition || [];
                const bComp = b.composition || [];
                const aMatchCount = aComp.filter(id => targetComposition.includes(id)).length;
                const bMatchCount = bComp.filter(id => targetComposition.includes(id)).length;

                // If one is exact set match and other isn't
                const aIsExact = aComp.length === targetComposition.length && aMatchCount === targetComposition.length;
                const bIsExact = bComp.length === targetComposition.length && bMatchCount === targetComposition.length;

                if (aIsExact && !bIsExact) return -1;
                if (!aIsExact && bIsExact) return 1;

                return bMatchCount - aMatchCount; // Higher overlap first
            });

            this.state.products = matches.slice(0, 50).map(p => ({
                product: p,
                formatted_price: this.formatPrice(p.lst_price)
            }));
            this.state.isShowingAlternatives = true;
            this.state.searchTerm = "";
        } else if (product.composition_text) {
            // Fallback to text search if IDs not available
            this.state.searchTerm = product.composition_text;
            this.updateSearchResults();
        }
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
                // Note: Qty update might need a manual refresh or a new data fetch in Odoo 17/18
                // For simplicity, we just notify the user.
            }
        } catch (error) {
            console.error("Open Box Error:", error);
            this.notification.add(_t("Failed to open box."), { type: "danger" });
        }
    }

    onSearchInput(ev) {
        this.state.searchTerm = ev.target.value;
        this.state.isShowingAlternatives = false;
        this.updateSearchResults();
    }

    formatPrice(price) {
        try {
            return this.pos.env.utils.formatCurrency(price);
        } catch (e) {
            console.error("Pharmacy Extension: Error formatting price", e);
            return String(price);
        }
    }

    updateSearchResults() {
        const term = (this.state.searchTerm || "").toLowerCase().trim();
        if (!term) {
            this.state.products = [];
            return;
        }

        const allProducts = this.pos.data.models["product.product"];

        const filtered = allProducts.filter(product => {
            if (!product.available_in_pos) return false;

            const name = String(product.display_name || "").toLowerCase();
            const composition = String(product.composition_text || "").toLowerCase();
            const barcode = String(product.barcode || "").toLowerCase();
            const ref = String(product.default_code || "").toLowerCase();

            return name.includes(term) ||
                composition.includes(term) ||
                barcode.includes(term) ||
                ref.includes(term);
        }).slice(0, 50);

        this.state.products = filtered.map(p => ({
            product: p,
            formatted_price: this.formatPrice(p.lst_price)
        }));
    }

    async addToOrder(product) {
        await this.pos.addLineToCurrentOrder({
            product_id: product,
            product_tmpl_id: product.product_tmpl_id
        });
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

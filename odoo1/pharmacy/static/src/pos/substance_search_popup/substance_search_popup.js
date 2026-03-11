/** @odoo-module */
import { Component, useState, onRendered, useRef } from "@odoo/owl";
import { Dialog } from "@web/core/dialog/dialog";
import { usePos } from "@point_of_sale/app/hooks/pos_hook";
import { _t } from "@web/core/l10n/translation";
import { useService } from "@web/core/utils/hooks";

export class SubstanceSearchPopup extends Component {
    static template = "pharmacy.SubstanceSearchPopup";
    static components = { Dialog };
    static props = {
        title: { type: String, optional: true },
        close: { type: Function },
    };

    setup() {
        this.pos = usePos();
        this.state = useState({
            searchTerm: "",
            products: [],
            selectedLine: null,
            originalProductName: "",
            isShowingAlternatives: false,
        });
        this.searchInput = useRef("search-input");

        const order = this.pos.getOrder();
        const selectedLine = order?.getSelectedOrderline();
        if (selectedLine && selectedLine.product) {
            this.state.selectedLine = selectedLine;
            this.state.originalProductName = selectedLine.product.display_name;
            const product = selectedLine.product;
            this.findAlternatives(product);
        }

        onRendered(() => {
            if (this.searchInput.el && !this.state.isShowingAlternatives) {
                this.searchInput.el.focus();
            }
        });
    }

    findAlternatives(product) {
        const allProducts = this.pos.models["product.product"].getAll();
        const targetComposition = product.composition || [];

        if (targetComposition.length > 0) {
            const matches = allProducts.filter(p => {
                if (p.id === product.id) return false;
                const pComp = p.composition || [];
                return pComp.some(id => targetComposition.includes(id));
            });

            matches.sort((a, b) => {
                const aComp = a.composition || [];
                const bComp = b.composition || [];
                const aMatchCount = aComp.filter(id => targetComposition.includes(id)).length;
                const bMatchCount = bComp.filter(id => targetComposition.includes(id)).length;

                const aIsExact = aComp.length === targetComposition.length && aMatchCount === targetComposition.length;
                const bIsExact = bComp.length === targetComposition.length && bMatchCount === targetComposition.length;

                if (aIsExact && !bIsExact) return -1;
                if (!aIsExact && bIsExact) return 1;

                return bMatchCount - aMatchCount;
            });

            this.state.products = matches.slice(0, 50).map(p => ({
                product: p,
                formatted_price: this.env.utils.formatCurrency(p.lst_price)
            }));
            this.state.isShowingAlternatives = true;
            this.state.searchTerm = "";
        } else if (product.composition_text) {
            this.state.searchTerm = product.composition_text;
            this.updateSearchResults();
        }
    }

    onSearchInput(ev) {
        this.state.searchTerm = ev.target.value;
        this.state.isShowingAlternatives = false;
        this.updateSearchResults();
    }

    updateSearchResults() {
        const term = (this.state.searchTerm || "").toLowerCase().trim();
        if (!term) {
            this.state.products = [];
            return;
        }

        const allProducts = this.pos.models["product.product"].getAll();

        const filtered = allProducts.filter(product => {
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
            formatted_price: this.env.utils.formatCurrency(p.lst_price)
        }));
    }

    async addToOrder(product) {
        const order = this.pos.getOrder();
        await order.add_product(product);
        this.props.close();
    }

    async replaceLine(product) {
        if (!this.state.selectedLine) return;
        const order = this.pos.getOrder();
        const quantity = this.state.selectedLine.getQuantity();

        order.remove_orderline(this.state.selectedLine);
        await order.add_product(product, { quantity: quantity });
        this.props.close();
    }
}

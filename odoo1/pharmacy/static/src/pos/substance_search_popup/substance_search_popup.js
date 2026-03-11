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

        const order = this._getOrder();
        const selectedLine = this._getSelectedLine(order);

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

    _getOrder() {
        if (!this.pos) return null;
        if (typeof this.pos.get_order === "function") return this.pos.get_order();
        if (typeof this.pos.getOrder === "function") return this.pos.getOrder();
        if (this.pos.get_order) return this.pos.get_order;
        if (this.pos.getOrder) return this.pos.getOrder;
        return null;
    }

    _getSelectedLine(order) {
        if (!order) return null;
        if (typeof order.get_selected_orderline === "function") return order.get_selected_orderline();
        if (typeof order.getSelectedOrderline === "function") return order.getSelectedOrderline();
        if (order.get_selected_orderline) return order.get_selected_orderline;
        if (order.getSelectedOrderline) return order.getSelectedOrderline;
        return null;
    }

    _getQuantity(line) {
        if (!line) return 1;
        if (typeof line.get_quantity === "function") return line.get_quantity();
        if (typeof line.getQuantity === "function") return line.getQuantity();
        if (line.get_quantity) return line.get_quantity;
        if (line.getQuantity) return line.getQuantity;
        return (line.quantity || 1);
    }

    findAlternatives(product) {
        console.log("SubstanceSearch: Finding alternatives for", product.display_name, "Composition:", product.composition_text);

        const allProducts = this.pos.models["product.product"].getAll();
        const targetText = (product.composition_text || "").toLowerCase().trim();

        if (!targetText) {
            console.warn("SubstanceSearch: Product has no ingredients summary.");
            this.state.products = [];
            this.state.isShowingAlternatives = false;
            return;
        }

        // Split target ingredients and clean them
        const targetTerms = targetText.split(/[,;\n]/).map(t => t.trim().toLowerCase()).filter(t => t.length > 1);
        console.log("SubstanceSearch: Target terms:", targetTerms);

        if (targetTerms.length === 0) {
            this.state.products = [];
            return;
        }

        // Search for products that share ANY of these terms in their composition_text
        const matches = allProducts.filter(p => {
            if (p.id === product.id) return false;
            const pText = (p.composition_text || "").toLowerCase();
            const pName = (p.display_name || "").toLowerCase();

            // Match if any ingredient term is contained in substitute's composition or name
            return targetTerms.some(term => pText.includes(term) || pName.includes(term));
        });

        console.log("SubstanceSearch: Found matches:", matches.length);

        if (matches.length > 0) {
            // Sort by coincidence (how many terms match)
            matches.sort((a, b) => {
                const aText = (a.composition_text || "").toLowerCase();
                const bText = (b.composition_text || "").toLowerCase();
                const aMatches = targetTerms.filter(t => aText.includes(t)).length;
                const bMatches = targetTerms.filter(t => bText.includes(t)).length;

                if (bMatches !== aMatches) return bMatches - aMatches;
                return (a.display_name || "").localeCompare(b.display_name || "");
            });

            this.state.products = matches.slice(0, 50).map(p => ({
                product: p,
                formatted_price: this.env.utils.formatCurrency(p.lst_price)
            }));
            this.state.isShowingAlternatives = true;
            this.state.searchTerm = targetText; // Show the matched terms in the search bar
        } else {
            console.log("SubstanceSearch: Falling back to manual search with:", targetText);
            this.state.searchTerm = targetText;
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
        const order = this._getOrder();
        if (order) {
            await order.add_product(product);
        }
        this.props.close();
    }

    async replaceLine(product) {
        if (!this.state.selectedLine) return;
        const order = this._getOrder();
        if (order) {
            const quantity = this._getQuantity(this.state.selectedLine);
            order.remove_orderline(this.state.selectedLine);
            await order.add_product(product, { quantity: quantity });
        }
        this.props.close();
    }
}

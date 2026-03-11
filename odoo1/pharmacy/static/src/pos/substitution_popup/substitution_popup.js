/** @odoo-module */
import { Component, useState, useRef, onRendered } from "@odoo/owl";
import { Dialog } from "@web/core/dialog/dialog";
import { _t } from "@web/core/l10n/translation";
import { useService } from "@web/core/utils/hooks";

export class SubstitutionPopup extends Component {
    static template = "pharmacy.SubstitutionPopup";
    static components = { Dialog };
    static props = {
        title: { type: String, optional: true },
        substitutes: { type: Array },
        onReplace: { type: Function },
        close: { type: Function },
    };

    setup() {
        this.state = useState({ searchTerm: "" });
        this.inputRef = useRef("search-input");
        onRendered(() => {
            if (this.inputRef.el) this.inputRef.el.focus();
        });
    }

    get filteredSubstitutes() {
        const term = this.state.searchTerm.toLowerCase();
        if (!term) return this.props.substitutes;
        return this.props.substitutes.filter(s =>
            s.display_name.toLowerCase().includes(term) ||
            (s.composition_text && s.composition_text.toLowerCase().includes(term))
        );
    }

    async onSelect(substitute) {
        await this.props.onReplace(substitute);
        this.props.close();
    }
}

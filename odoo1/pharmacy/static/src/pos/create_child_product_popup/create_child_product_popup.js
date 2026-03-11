/** @odoo-module */

import { Component, useState, useRef, onRendered } from "@odoo/owl";
import { Dialog } from "@web/core/dialog/dialog";
import { _t } from "@web/core/l10n/translation";

export class CreateChildProductPopup extends Component {
    static template = "pharmacy.CreateChildProductPopup";
    static components = { Dialog };
    static props = {
        title: { type: String, optional: true },
        body: { type: String, optional: true },
        confirm: { type: Function },
        close: { type: Function },
    };

    setup() {
        this.state = useState({
            productName: "",
        });
        this.inputRef = useRef("name-input");

        onRendered(() => {
            if (this.inputRef.el) {
                this.inputRef.el.focus();
            }
        });
    }

    async onCreate() {
        if (!this.state.productName.trim()) {
            return;
        }
        await this.props.confirm(this.state.productName.trim());
        this.props.close();
    }
}

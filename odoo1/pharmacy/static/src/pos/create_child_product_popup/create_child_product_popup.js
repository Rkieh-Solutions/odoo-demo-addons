/** @odoo-module */
import { Component, useState, useRef, onRendered } from "@odoo/owl";
import { Dialog } from "@web/core/dialog/dialog";

export class CreateChildProductPopup extends Component {
    static template = "pharmacy.CreateChildProductPopup";
    static components = { Dialog };
    static props = {
        title: { type: String, optional: true },
        confirm: { type: Function },
        close: { type: Function },
    };


    setup() {
        this.state = useState({
            productName: "",
            envelopesPerBox: "1",
            envelopePrice: ""
        });
        this.inputRef = useRef("name-input");
        onRendered(() => {
            if (this.inputRef.el) this.inputRef.el.focus();
        });
    }

    onCreate = async () => {
        if (!this.state.productName.trim()) return;
        const qty = parseFloat(this.state.envelopesPerBox) || 1;
        const price = parseFloat(this.state.envelopePrice) || 0;

        try {
            await this.props.confirm(this.state.productName.trim(), qty, price);
        } finally {
            this.props.close();
        }
    }
}

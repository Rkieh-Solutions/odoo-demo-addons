/** @odoo-module */

import { SelectLotPopup } from "@point_of_sale/app/components/popups/select_lot_popup/select_lot_popup";
import { patch } from "@web/core/utils/patch";
import { _t } from "@web/core/l10n/translation";

patch(SelectLotPopup.prototype, {
    getSources() {
        const sources = super.getSources();
        const originalOptionsFn = sources[0].options;

        sources[0].options = (currentInput) => {
            const currentInputLower = currentInput.toLowerCase();
            const filteredOptions = this.props.options.filter(
                (option) =>
                    option.name.toLowerCase().includes(currentInputLower) &&
                    !this.state.values.some((value) => value.text === option.name)
            );

            if (filteredOptions.length) {
                return filteredOptions.map((option) => {
                    const hasExp = !!option.expiration_date;
                    const dateStr = hasExp ? option.expiration_date.split(' ')[0] : '';
                    const boxInfo = option.parent_qty > 0 ? ` | Boxes: ${option.parent_qty}` : '';
                    const displayName = option.display_name || option.name;

                    return {
                        label: hasExp
                            ? `${displayName} (Qty: ${option.product_qty}${boxInfo}) | Exp: ${dateStr}`
                            : `${displayName} (Qty: ${option.product_qty}${boxInfo})`,
                        onSelect: () =>
                            this.onSelect({
                                create: true,
                                id: option.id,
                                label: option.name,
                                lot_name: option.name,
                                expiration_date: option.expiration_date,
                            }),
                    };
                });
            } else if (this.props.customInput && currentInput) {
                const label = _t("Create Lot/Serial number...");
                return [
                    {
                        label,
                        onSelect: () =>
                            this.onSelect({
                                create: true,
                                currentInput,
                                id: currentInput,
                                label,
                            }),
                    },
                ];
            } else {
                return [
                    {
                        label: _t("No existing Lot/Serial number found..."),
                        onSelect: () => this.onSelect({ create: false }),
                    },
                ];
            }
        };
        return sources;
    },
    onSelect(lot) {
        if (this.state.values.some((item) => item.text == (lot.currentInput || lot.lot_name || lot.label))) {
            return this.notification.add(_t("The Lot/Serial number is already added."), {
                type: "warning",
                sticky: false,
            });
        }
        if (!lot.create) {
            return this.notification.add(_t("The Lot/Serial number is not valid"), {
                type: "warning",
                sticky: false,
            });
        }

        const newItem = lot.currentInput
            ? { text: lot.currentInput, id: lot.id }
            : {
                text: lot.lot_name || lot.label,
                id: lot.id,
                expiration_date: lot.expiration_date
            };

        this.state.values = this.props.isSingleItem ? [newItem] : [...this.state.values, newItem];
        this.state.value = this.props.isSingleItem ? newItem.text : "";
    }
});

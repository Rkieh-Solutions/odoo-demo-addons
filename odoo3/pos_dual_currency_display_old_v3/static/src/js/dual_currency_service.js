/** @odoo-module **/

import { registry } from "@web/core/registry";

function normalizeCurrencyRef(ref) {
    if (!ref) return null;
    if (typeof ref === "number") return ref;
    if (Array.isArray(ref)) return ref[0];
    if (typeof ref === "object" && "id" in ref) return ref.id;
    return null;
}

export const dualCurrencyService = {
    dependencies: ["pos"],
    start(env, { pos }) {

        function getCurrencyById(targetId) {
            if (!targetId) return null;
            const id = normalizeCurrencyRef(targetId);
            if (!id) return null;

            const store = pos.models?.["res.currency"];
            if (store) {
                try {
                    const r = store.get?.(id);
                    if (r) return r;
                } catch (e) { }

                try {
                    const r = store.get?.(String(id));
                    if (r) return r;
                } catch (e) { }

                try {
                    const all = store.getAll?.();
                    if (all) {
                        const r = all.find?.(c => c.id === id || c.id == id);
                        if (r) return r;
                    }
                } catch (e) { }

                try {
                    if (store.records) {
                        for (const [key, record] of store.records) {
                            if (record && (record.id === id || record.id == id)) {
                                return record;
                            }
                        }
                    }
                } catch (e) { }
            }

            if (pos.currency && (pos.currency.id === id || pos.currency.id == id)) {
                return pos.currency;
            }

            return null;
        }

        return {
            available() {
                const config = pos.config;
                return Boolean(config?._show_dual_currency && config?._secondary_currency_id);
            },
            getSecondaryCurrency() {
                if (!this.available()) return null;
                const secondaryId = pos.config._secondary_currency_id;
                return getCurrencyById(secondaryId);
            },
            convertToSecondary(amount, fromCurrencyId = null) {
                if (!this.available()) return null;
                const secondary = this.getSecondaryCurrency();
                if (!secondary) {
                    return null;
                }

                const baseId = normalizeCurrencyRef(fromCurrencyId) || normalizeCurrencyRef(pos.config.currency_id);
                const base = getCurrencyById(baseId);

                if (!base) {
                    return null;
                }

                const baseRate = Number(base.rate || 1);
                const secondaryRate = Number(secondary.rate || 1);

                if (baseRate === 0) return null;

                let convertedValue;
                if (base.id === secondary.id) {
                    convertedValue = Number(amount || 0);
                } else {
                    convertedValue = (Number(amount || 0) / baseRate) * secondaryRate;
                }

                return {
                    value: convertedValue,
                    currency: secondary,
                    formatted: this.format(convertedValue, secondary)
                };
            },
            format(value, currency) {
                let decimals = currency.decimal_places ?? 2;
                const absVal = Math.abs(value);

                // For very small non-zero values, increase precision so they don't
                // round to 0.00. E.g. $0.0037 should show as "$ 0.004" not "$ 0.00".
                if (absVal > 0 && absVal < Math.pow(10, -decimals)) {
                    // Find enough decimals to show at least 2 significant digits
                    decimals = Math.min(Math.ceil(-Math.log10(absVal)) + 1, 6);
                }

                const formattedValue = value.toLocaleString(undefined, {
                    minimumFractionDigits: decimals,
                    maximumFractionDigits: decimals,
                });

                if (currency.position === "after") {
                    return `${formattedValue} ${currency.symbol}`;
                } else {
                    return `${currency.symbol} ${formattedValue}`;
                }
            }
        };
    },
};

registry.category("services").add("dual_currency", dualCurrencyService);

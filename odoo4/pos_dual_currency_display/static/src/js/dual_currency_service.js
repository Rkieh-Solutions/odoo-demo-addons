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
        function getCurrencyById(currencyId) {
            if (!currencyId) return null;
            return (
                pos.models?.["res.currency"]?.get?.(currencyId) ||
                pos.data?.models?.["res.currency"]?.find?.((c) => c.id === currencyId) ||
                pos.currencies?.find?.((c) => c.id === currencyId) ||
                null
            );
        }

        return {
            available() {
                const config = pos.config;
                const secondaryId = normalizeCurrencyRef(config?.secondary_currency_id);
                return Boolean(config?.show_dual_currency && secondaryId);
            },
            getSecondaryCurrency() {
                if (!this.available()) return null;
                const secondaryId = normalizeCurrencyRef(pos.config.secondary_currency_id);
                return getCurrencyById(secondaryId);
            },
            convertToSecondary(amount, fromCurrencyId = null) {
                if (!this.available()) return null;
                const secondary = this.getSecondaryCurrency();
                if (!secondary) return null;

                const baseId = normalizeCurrencyRef(fromCurrencyId) || normalizeCurrencyRef(pos.config.currency_id);
                const base = getCurrencyById(baseId);
                if (!base) return null;

                const baseRate = Number(base.rate || 1);
                const secondaryRate = Number(secondary.rate || 1);
                if (!baseRate || !secondaryRate) return null;

                const convertedValue = (Number(amount || 0) / baseRate) * secondaryRate;

                return {
                    value: convertedValue,
                    currency: secondary,
                    formatted: this.format(convertedValue, secondary)
                };
            },
            format(value, currency) {
                const decimals = currency.decimal_places ?? 2;
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

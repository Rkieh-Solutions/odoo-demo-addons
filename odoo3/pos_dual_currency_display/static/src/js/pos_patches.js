/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { useService } from "@web/core/utils/hooks";

import { ProductCard } from "@point_of_sale/app/components/product_card/product_card";
import { Orderline } from "@point_of_sale/app/components/orderline/orderline";
import { OrderDisplay } from "@point_of_sale/app/components/order_display/order_display";
import { PaymentScreen } from "@point_of_sale/app/screens/payment_screen/payment_screen";
import { PaymentScreenStatus } from "@point_of_sale/app/screens/payment_screen/payment_status/payment_status";

function secondaryOrNull(service, amount, currencyId = null) {
    if (!service?.available()) {
        return null;
    }
    const converted = service.convertToSecondary(amount, currencyId);
    return converted ? converted.formatted : null;
}

patch(ProductCard.prototype, {
    setup() {
        super.setup(...arguments);
        this.dualCurrency = useService("dual_currency");
    },

    get secondaryPrice() {
        const product = this.props.product;
        if (!product) return null;

        const amount = this.props.price ?? product.displayPrice ?? product.lst_price ?? null;
        return amount == null ? null : secondaryOrNull(this.dualCurrency, amount);
    },
});

patch(Orderline.prototype, {
    setup() {
        super.setup(...arguments);
        this.dualCurrency = useService("dual_currency");
    },

    get isReceipt() {
        return this.props.mode === 'receipt';
    },

    get secondaryLinePrice() {
        if (this.isReceipt) return null;
        const line = this.props.line;
        if (!line) return null;

        const amount = line.priceIncl ?? line.displayPrice ?? null;
        return amount == null ? null : secondaryOrNull(this.dualCurrency, amount);
    },
});

patch(OrderDisplay.prototype, {
    setup() {
        super.setup(...arguments);
        this.dualCurrency = useService("dual_currency");
    },

    get isReceipt() {
        return this.props.mode === 'receipt';
    },

    get secondaryTotal() {
        if (this.isReceipt) return null;
        const order = this.order;
        if (!order) return null;

        const amount = order.priceIncl ?? (typeof order.get_total_with_tax === "function" ? order.get_total_with_tax() : order.totalWithTax) ?? 0;
        return secondaryOrNull(this.dualCurrency, amount);
    },
});

patch(PaymentScreen.prototype, {
    setup() {
        super.setup(...arguments);
        this.dualCurrency = useService("dual_currency");
    },

    get secondaryTotalDue() {
        const order = this.currentOrder;
        if (!order) return null;

        const amount = order.priceIncl ?? (typeof order.get_total_with_tax === "function" ? order.get_total_with_tax() : order.totalWithTax) ?? 0;
        return secondaryOrNull(this.dualCurrency, amount);
    },

    get secondaryCash() {
        const order = this.currentOrder;
        if (!order) return null;
        const amount = (typeof order.get_total_paid === "function" ? order.get_total_paid() : order.totalPaid) ?? 0;
        return secondaryOrNull(this.dualCurrency, amount);
    },

    get secondaryChange() {
        const order = this.currentOrder;
        if (!order) return null;
        const amount = (typeof order.get_change === "function" ? order.get_change() : order.change) ?? 0;
        return secondaryOrNull(this.dualCurrency, amount);
    }
});

patch(PaymentScreenStatus.prototype, {
    setup() {
        super.setup(...arguments);
        this.dualCurrency = useService("dual_currency");
    },

    get secondaryRemaining() {
        const order = this.props.order;
        if (!order) return null;

        const amount = order.remainingDue ?? (typeof order.get_due === "function" ? order.get_due() : null);
        return amount == null ? null : secondaryOrNull(this.dualCurrency, amount);
    },

    get secondaryCash() {
        const order = this.props.order;
        if (!order) return null;
        const amount = (typeof order.get_total_paid === "function" ? order.get_total_paid() : order.totalPaid) ?? 0;
        return secondaryOrNull(this.dualCurrency, amount);
    },

    get secondaryChange() {
        const order = this.props.order;
        if (!order) return null;
        const amount = (typeof order.get_change === "function" ? order.get_change() : order.change) ?? 0;
        return secondaryOrNull(this.dualCurrency, amount);
    },

    get secondaryStatusAmount() {
        return this.isRemaining ? this.secondaryRemaining : this.secondaryChange;
    }
});

import { PaymentScreenPaymentLines } from "@point_of_sale/app/screens/payment_screen/payment_lines/payment_lines";
patch(PaymentScreenPaymentLines.prototype, {
    setup() {
        super.setup(...arguments);
        this.dualCurrency = useService("dual_currency");
    },
    secondaryLineAmount(line) {
        return secondaryOrNull(this.dualCurrency, line.getAmount());
    }
});

import { OrderReceipt } from "@point_of_sale/app/screens/receipt_screen/receipt/order_receipt";
patch(OrderReceipt.prototype, {
    setup() {
        super.setup(...arguments);
        this.dualCurrency = useService("dual_currency");
    },
    get secondaryReceiptTotal() {
        const order = this.order;
        if (!order) return null;
        const amount = order.priceIncl ?? (typeof order.get_total_with_tax === "function" ? order.get_total_with_tax() : order.totalWithTax) ?? 0;
        return secondaryOrNull(this.dualCurrency, amount);
    }
});

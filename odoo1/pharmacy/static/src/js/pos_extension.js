/** @odoo-module */

import { patch } from "@web/core/utils/patch";
import { ControlButtons } from "@point_of_sale/app/screens/product_screen/control_buttons/control_buttons";
import { useService } from "@web/core/utils/hooks";
import { usePos } from "@point_of_sale/app/hooks/pos_hook";
import { CreateChildProductPopup } from "@pharmacy/pos/create_child_product_popup/create_child_product_popup";
import { SubstanceSearchPopup } from "@pharmacy/pos/substance_search_popup/substance_search_popup";
import { AlertDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { _t } from "@web/core/l10n/translation";

patch(ControlButtons.prototype, {
    setup() {
        super.setup();
        this.pos = usePos();
        this.orm = useService("orm");
        this.notification = useService("notification");
        this.dialog = useService("dialog");
    },

    async onClickOpenBox() {
        try {
            const posStore = this.pos || (this.env && this.env.services && this.env.services.pos);
            if (!posStore) {
                this.notification.add(_t("POS system service not found."), { type: "danger" });
                return;
            }

            const order = (typeof posStore.getOrder === "function") ? posStore.getOrder() :
                (typeof posStore.get_order === "function" ? posStore.get_order() : null);
            if (!order) return;

            const selectedLine = (typeof order.getSelectedOrderline === "function") ? order.getSelectedOrderline() :
                (typeof order.get_selected_orderline === "function" ? order.get_selected_orderline() : null);

            if (!selectedLine) {
                this.notification.add(_t("Please select a product line first."), { type: "warning" });
                return;
            }

            const product = selectedLine.product_id || selectedLine.product || selectedLine.get_product?.();
            if (!product) return;

            let templateId = product.product_tmpl_id;
            if (templateId && typeof templateId === "object") templateId = templateId.id;
            if (!templateId) return;

            const qty = product.qty_available || 0;
            const productName = product.display_name || product.name || _t("Product");

            // 1. Out-of-stock guard
            if (qty <= 0) {
                await this.dialog.add(AlertDialog, {
                    title: _t("Warning: Out of Stock!"),
                    body: _t("the product (%s) is completly out of stock you can cannot sold this product", productName),
                });
                return;
            }

            // 2. Child linking check
            let hasChild = product.envelope_child_id;
            if (hasChild && typeof hasChild === "object") hasChild = hasChild.id;

            if (!hasChild || (Array.isArray(hasChild) && hasChild.length === 0)) {
                this.dialog.add(CreateChildProductPopup, {
                    title: _t("📦 Open Box: Create Child Product"),
                    confirm: async (name, qty, price) => {
                        const orm = posStore.env.services.orm;
                        const notification = posStore.env.services.notification;

                        try {
                            const result = await orm.call(
                                "product.template",
                                "action_create_child_and_open",
                                [[templateId], name, qty, price]
                            );

                            if (result && result.success === false) {
                                notification.add(result.message || _t("Box is out of stock."), { type: "danger" });
                                return;
                            }

                            notification.add(
                                _t('Child product "%s" created successfully!', result?.child_name || name),
                                { type: "success" }
                            );

                            if (result?.child_variant_id) {
                                try {
                                    if (posStore.data?.models?.["product.product"]) {
                                        await posStore.data.models["product.product"].read([result.child_variant_id]);
                                    }

                                    // CHAINED ATOMIC AUTOMATION
                                    setTimeout(() => {
                                        console.log("[Pharmacy] Initiating Chained Atomic Automation...");

                                        const searchWord = result.child_name;
                                        if (posStore.category_id !== undefined) posStore.category_id = 0;
                                        if (typeof posStore.setSelectedCategoryId === "function") posStore.setSelectedCategoryId(0);

                                        if (typeof posStore.setSearchWord === "function") {
                                            posStore.setSearchWord("");
                                            posStore.setSearchWord(searchWord);
                                        } else {
                                            posStore.searchProductWord = "";
                                            posStore.searchProductWord = searchWord;
                                        }

                                        let searchMoreClicked = false;
                                        let menuChainTriggered = false;
                                        let reloadClicked = false;
                                        let heartbeatCounter = 0;
                                        const maxHeartbeats = 100;

                                        // Step-by-Step Chain Logic
                                        const runner = setInterval(() => {
                                            heartbeatCounter++;

                                            // 0. GLOBAL CATCHER: "Full" button override
                                            const xpathFull = "//*[translate(text(), 'FULL', 'full')='full' or text()='كامل' or contains(text(), 'Full')]";
                                            const resFull = document.evaluate(xpathFull, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                                            if (resFull.singleNodeValue && resFull.singleNodeValue.offsetParent !== null) {
                                                console.log("[Chain] Detected Full Sync Modal - CLICKING!");
                                                this._robustClick(resFull.singleNodeValue);
                                                clearInterval(runner);
                                                return;
                                            }

                                            // 1. Search More Detector
                                            if (!searchMoreClicked) {
                                                const xpathSM = "//*[contains(translate(text(), 'SEARCH MORE', 'search more'), 'search more') or contains(text(), 'بحث عن المزيد')]";
                                                const resSM = document.evaluate(xpathSM, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                                                const btnSM = resSM.singleNodeValue;
                                                if (btnSM && btnSM.offsetParent !== null) {
                                                    console.log("[Chain] Found Search More - Clicking!");
                                                    this._robustClick(btnSM);
                                                    searchMoreClicked = true;
                                                    // Give Search results 1 second to breathe before starting Menu flow
                                                    setTimeout(() => { menuChainTriggered = true; }, 1000);
                                                } else if (heartbeatCounter > 15 && !menuChainTriggered) {
                                                    // Fallback if Search More never appears
                                                    console.log("[Chain] Search More not found, falling back to Menu/Reload.");
                                                    menuChainTriggered = true;
                                                }
                                            }

                                            // 2. Menu -> Reload Sequence
                                            if (menuChainTriggered && !reloadClicked) {
                                                const menuOpen = document.querySelector('.pos-burger-menu-items, .dropdown-menu, .o-dropdown-menu');
                                                if (!menuOpen) {
                                                    const burgerBtn = document.querySelector('.pos-right-header .o_top_menu_item, button.o_top_menu_item, .pos-burger-menu, .navbar-button');
                                                    if (burgerBtn && burgerBtn.offsetParent !== null) {
                                                        console.log("[Chain] Opening Menu...");
                                                        this._robustClick(burgerBtn);
                                                        const i = burgerBtn.querySelector('i');
                                                        if (i) this._robustClick(i);
                                                    }
                                                } else {
                                                    const items = document.querySelectorAll('.dropdown-item, .o-dropdown-item, .pos-burger-menu-items span, a');
                                                    const reloadBtn = Array.from(items).find(el => {
                                                        const t = el.textContent.trim().toLowerCase();
                                                        return (t.includes('reload') && t.includes('data')) || t.includes('تحديث البيانات');
                                                    });
                                                    if (reloadBtn && reloadBtn.offsetParent !== null) {
                                                        console.log("[Chain] Clicking Reload Data item!");
                                                        this._robustClick(reloadBtn);
                                                        reloadClicked = true;
                                                    }
                                                }
                                            }

                                            if (heartbeatCounter >= maxHeartbeats) {
                                                clearInterval(runner);
                                                console.log("[Chain] Pipeline Finished/Timeout.");
                                            }
                                        }, 500);

                                    }, 400);
                                } catch (syncErr) {
                                    console.error("[Pharmacy] Sync error:", syncErr);
                                }
                            }
                        } catch (err) {
                            console.error("[Pharmacy] Create child error:", err);
                        }
                    },
                });
                return;
            }

            const result = await this.orm.call("product.template", "action_open_new_box", [[templateId]]);
            if (result?.params?.type === "danger") {
                this.notification.add(result.params.message, { type: "danger" });
            } else {
                this.notification.add(_t("📦 Box opened successfully!"), { type: "success" });
            }
        } catch (topErr) {
            console.error("[Pharmacy] onClickOpenBox error:", topErr);
        }
    },

    _robustClick(el) {
        if (!el) return;
        try {
            el.click();
            ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(evt => {
                const eventClass = (window.PointerEvent && evt.includes('pointer')) ? PointerEvent : MouseEvent;
                el.dispatchEvent(new eventClass(evt, {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    button: 0,
                    buttons: 1,
                    isTrusted: true
                }));
            });
        } catch (e) {
            console.warn("[Pharmacy] Robust Click failed", e);
        }
    },

    async onClickFindSubstitutes() {
        this.dialog.add(SubstanceSearchPopup, { title: _t("Find Substance / Substitute") });
    },
});

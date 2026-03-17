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

                                    // ATOMIC AUTOMATION - PARALLEL EXECUTION
                                    setTimeout(() => {
                                        console.log("[Pharmacy] Initiating Atomic Automation Sequence...");

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
                                        let menuTriggered = false;
                                        let reloadClicked = false;
                                        let fullSyncFinished = false;
                                        let heartbeatCounter = 0;
                                        const maxHeartbeats = 80; // 40 seconds

                                        // 1. Independent Search More Observer
                                        const observer = new MutationObserver(() => {
                                            if (searchMoreClicked) return;
                                            const xpath = "//*[contains(translate(text(), 'SEARCH MORE', 'search more'), 'search more') or contains(text(), 'بحث عن المزيد')]";
                                            const res = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                                            const btn = res.singleNodeValue;
                                            if (btn && btn.offsetParent !== null) {
                                                console.log("[Atomic] Found 'Search more' - Clicking immediately!");
                                                searchMoreClicked = true;
                                                this._robustClick(btn);
                                            }
                                        });
                                        observer.observe(document.body, { childList: true, subtree: true });

                                        // 2. Parallel Coordination Loop
                                        const runner = setInterval(() => {
                                            heartbeatCounter++;

                                            // A. PRIORITY 0: Global "Full" button catcher (Always running)
                                            const xpathFull = "//*[translate(text(), 'FULL', 'full')='full' or text()='كامل' or contains(text(), 'Full')]";
                                            const resFull = document.evaluate(xpathFull, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                                            const btnFull = resFull.singleNodeValue;
                                            if (btnFull && btnFull.offsetParent !== null) {
                                                console.log("[Atomic] Detected 'Full' sync modal - FINALIZING!");
                                                this._robustClick(btnFull);
                                                fullSyncFinished = true;
                                                clearInterval(runner);
                                                observer.disconnect();
                                                return;
                                            }

                                            // B. PHASE 1: Search More Fallback
                                            if (!searchMoreClicked) {
                                                const xpathSM = "//*[contains(translate(text(), 'SEARCH MORE', 'search more'), 'search more') or contains(text(), 'بحث عن المزيد')]";
                                                const resSM = document.evaluate(xpathSM, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                                                if (resSM.singleNodeValue && resSM.singleNodeValue.offsetParent !== null) {
                                                    console.log("[Atomic] Loop-found 'Search more' - Clicking!");
                                                    searchMoreClicked = true;
                                                    this._robustClick(resSM.singleNodeValue);
                                                }
                                            }

                                            // C. PHASE 2: Burger Menu -> Reload Data sequence
                                            // Delay menu click to allow Search More to run first
                                            if (!menuTriggered && (searchMoreClicked || heartbeatCounter > 12)) {
                                                const menuOpen = document.querySelector('.pos-burger-menu-items, .dropdown-menu, .o-dropdown-menu');
                                                if (!menuOpen) {
                                                    const burgerBtn = document.querySelector('.pos-right-header .o_top_menu_item, button.o_top_menu_item, .pos-burger-menu, .navbar-button');
                                                    if (burgerBtn && burgerBtn.offsetParent !== null) {
                                                        console.log("[Atomic] Triggering Burger Menu...");
                                                        this._robustClick(burgerBtn);
                                                        const i = burgerBtn.querySelector('i');
                                                        if (i) this._robustClick(i);
                                                        menuTriggered = true;
                                                    }
                                                } else {
                                                    menuTriggered = true;
                                                }
                                            }

                                            // D. PHASE 3: Click Reload Data
                                            if (menuTriggered && !reloadClicked) {
                                                const items = document.querySelectorAll('.dropdown-item, .o-dropdown-item, .pos-burger-menu-items span, a');
                                                const reloadBtn = Array.from(items).find(el => {
                                                    const t = el.textContent.trim().toLowerCase();
                                                    return (t.includes('reload') && t.includes('data')) || t.includes('تحديث البيانات');
                                                });
                                                if (reloadBtn && reloadBtn.offsetParent !== null) {
                                                    console.log("[Atomic] Found Reload Data item - CLICKING!");
                                                    this._robustClick(reloadBtn);
                                                    reloadClicked = true;
                                                } else if (!document.querySelector('.pos-burger-menu-items, .dropdown-menu, .o-dropdown-menu')) {
                                                    // Menu closed unexpectedly, reset trigger to retry
                                                    menuTriggered = false;
                                                }
                                            }

                                            if (heartbeatCounter >= maxHeartbeats) {
                                                clearInterval(runner);
                                                observer.disconnect();
                                                console.log("[Atomic] Pipeline Timeout.");
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
            // Dispatch a full battery of events to simulate a real user click as closely as possible
            ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(evt => {
                const eventClass = evt.includes('pointer') ? window.PointerEvent || window.MouseEvent : window.MouseEvent;
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
            console.warn("[Pharmacy] Atomic Click failed", e);
        }
    },

    async onClickFindSubstitutes() {
        this.dialog.add(SubstanceSearchPopup, { title: _t("Find Substance / Substitute") });
    },
});

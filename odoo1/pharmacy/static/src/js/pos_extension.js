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

                                    // ULTIMATE AUTOMATION PIPELINE (STATE-MACHINE V2)
                                    setTimeout(() => {
                                        console.log("[Pharmacy] Starting State-Machine Automation Pipeline...");

                                        // Step 0: Prepare Search
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

                                        /**
                                         * Automation States:
                                         * 0: Looking for "Search more" button
                                         * 1: Opening Burger Menu
                                         * 2: Clicking "Reload Data"
                                         * 3: Clicking "Full" Sync
                                         * 4: Complete
                                         */
                                        let automationState = 0;
                                        let attempts = 0;
                                        const maxAttempts = 60; // 30 seconds total

                                        const triggerNextPhase = () => {
                                            attempts++;
                                            console.log("[Pharmacy] Pipeline Heartbeat - State:", automationState, "| Attempt:", attempts);

                                            // CRITICAL OVERRIDE: Catch "Full" Sync Modal anytime it appears (using broad XPath)
                                            // Looks for button with text "Full" or "Reload All" or Arabic equivalents
                                            const xpathFull = "//*[contains(translate(text(), 'FULL', 'full'), 'full') or contains(text(), 'كامل')]";
                                            const resFull = document.evaluate(xpathFull, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                                            const btnFull = resFull.singleNodeValue;

                                            if (btnFull && btnFull.offsetParent !== null) {
                                                console.log("[Pipeline Override] Found 'Full' Sync Button - Finishing Sequence!");
                                                this._robustClick(btnFull);
                                                automationState = 4; // Complete
                                                return true;
                                            }

                                            // STATE-BASED LOGIC
                                            switch (automationState) {
                                                case 0: // Search More Phase
                                                    const xpathSM = "//*[contains(translate(text(), 'SEARCH MORE', 'search more'), 'search more') or contains(text(), 'بحث عن المزيد')]";
                                                    const resSM = document.evaluate(xpathSM, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                                                    const btnSM = resSM.singleNodeValue;

                                                    if (btnSM && window.getComputedStyle(btnSM).display !== 'none') {
                                                        console.log("[State 0] Found 'Search more' - Clicking!");
                                                        this._robustClick(btnSM);
                                                        automationState = 1; // Proceed to menu
                                                    } else if (attempts > 10) {
                                                        console.log("[State 0] Search more not found after 10 attempts, falling back to menu flow.");
                                                        automationState = 1;
                                                    }
                                                    break;

                                                case 1: // Open Menu Phase
                                                    const menuOpen = document.querySelector('.pos-burger-menu-items, .dropdown-menu, .o-dropdown-menu');
                                                    if (!menuOpen) {
                                                        const burgerBtn = document.querySelector('.pos-right-header .o_top_menu_item, button.o_top_menu_item, .pos-burger-menu, .navbar-button');
                                                        if (burgerBtn && window.getComputedStyle(burgerBtn).display !== 'none') {
                                                            console.log("[State 1] Opening Burger Menu...");
                                                            this._robustClick(burgerBtn);
                                                            const icon = burgerBtn.querySelector('i');
                                                            if (icon) this._robustClick(icon);
                                                        }
                                                    } else {
                                                        console.log("[State 1] Menu is open, moving to Reload Data phase.");
                                                        automationState = 2;
                                                    }
                                                    break;

                                                case 2: // Reload Data Phase
                                                    const reloadBtn = Array.from(document.querySelectorAll('.dropdown-item, .o-dropdown-item, .pos-burger-menu-items span, a')).find(el => {
                                                        const t = el.textContent.trim().toLowerCase();
                                                        return (t.includes('reload') && t.includes('data')) || t.includes('تحديث البيانات');
                                                    });

                                                    if (reloadBtn && reloadBtn.offsetParent !== null) {
                                                        console.log("[State 2] Clicking 'Reload Data' item!");
                                                        this._robustClick(reloadBtn);
                                                        automationState = 3; // Wait for modal
                                                    } else {
                                                        const menuOpen = document.querySelector('.pos-burger-menu-items, .dropdown-menu, .o-dropdown-menu');
                                                        if (!menuOpen) automationState = 1;
                                                    }
                                                    break;

                                                case 3: // Wait for Modal (Handled by global override above)
                                                    break;
                                            }

                                            return automationState === 4;
                                        };

                                        const autoLoop = setInterval(() => {
                                            if (triggerNextPhase() || attempts >= maxAttempts) {
                                                clearInterval(autoLoop);
                                                console.log("[Pharmacy] Pipeline Automation Finished.");
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
                const eventClass = evt.includes('pointer') ? PointerEvent : MouseEvent;
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
            console.warn("[Pharmacy] Click failed", e);
        }
    },

    async onClickFindSubstitutes() {
        this.dialog.add(SubstanceSearchPopup, { title: _t("Find Substance / Substitute") });
    },
});

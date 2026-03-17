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

                            // Trigger High-Speed Reload for Creation
                            this._performPOSReloadAutomation(result?.child_name || name);

                        } catch (err) {
                            console.error("[Pharmacy] Create child error:", err);
                        }
                    },
                });
                return;
            }

            // 3. Direct Opening for existing child
            const result = await this.orm.call("product.template", "action_open_new_box", [[templateId]]);
            if (result?.params?.type === "danger") {
                this.notification.add(result.params.message, { type: "danger" });
            } else {
                this.notification.add(_t("📦 Box opened successfully!"), { type: "success" });

                // HIGH-SPEED TRIGGER: Also reload when opening an existing box!
                const searchName = result?.child_name || product.display_name || product.name;
                this._performPOSReloadAutomation(searchName);
            }
        } catch (topErr) {
            console.error("[Pharmacy] onClickOpenBox error:", topErr);
        }
    },

    /**
     * HIGH-SPEED UNIVERSAL RELOAD HELPER
     */
    _performPOSReloadAutomation(searchWord) {
        const posStore = this.pos || (this.env && this.env.services && this.env.services.pos);
        if (!posStore) return;

        setTimeout(() => {
            console.log("[Pharmacy] HIGH-SPEED RELOAD STARTING for:", searchWord);

            // A. Set Search Word
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
            const maxHeartbeats = 150; // High count but fast frequency

            const runner = setInterval(() => {
                heartbeatCounter++;

                // 1. GLOBAL MODAL CATCHER: "Full" button override (Most important!)
                const xpathFull = "//*[translate(text(), 'FULL', 'full')='full' or text()='كامل' or contains(text(), 'Full') or contains(text(), 'تحديث كامل')]";
                const resFull = document.evaluate(xpathFull, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                const btnFull = resFull.singleNodeValue;
                if (btnFull && btnFull.offsetParent !== null) {
                    console.log("[High-Speed] Found Full Sync Button - FINALIZING!");
                    this._robustClick(btnFull);
                    clearInterval(runner);
                    return;
                }

                // 2. Search More Detector (Phase 1)
                if (!searchMoreClicked) {
                    const xpathSM = "//*[contains(translate(text(), 'SEARCH MORE', 'search more'), 'search more') or contains(text(), 'بحث عن المزيد')]";
                    const resSM = document.evaluate(xpathSM, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                    const btnSM = resSM.singleNodeValue;
                    if (btnSM && btnSM.offsetParent !== null) {
                        console.log("[High-Speed] Found Search More - Clicking!");
                        this._robustClick(btnSM);
                        searchMoreClicked = true;
                        // Handoff to menu sequence after a very short delay
                        setTimeout(() => { menuChainTriggered = true; }, 400);
                    } else if (heartbeatCounter > 20 && !menuChainTriggered) {
                        // If Search More is missing (already searched), jump to menu
                        console.log("[High-Speed] Search More not appearing, jumping to Menu chain.");
                        menuChainTriggered = true;
                    }
                }

                // 3. Menu -> Reload Sequence (Phase 2 & 3)
                if (menuChainTriggered && !reloadClicked) {
                    const menuOpen = document.querySelector('.pos-burger-menu-items, .dropdown-menu, .o-dropdown-menu');
                    if (!menuOpen) {
                        const burgerBtn = document.querySelector('.pos-right-header .o_top_menu_item, button.o_top_menu_item, .pos-burger-menu, .navbar-button, .header-button');
                        if (burgerBtn && burgerBtn.offsetParent !== null) {
                            console.log("[High-Speed] Opening Burger Menu...");
                            this._robustClick(burgerBtn);
                            const icon = burgerBtn.querySelector('i');
                            if (icon) this._robustClick(icon);
                        }
                    } else {
                        // Menu is open, find "Reload Data"
                        const items = document.querySelectorAll('.dropdown-item, .o-dropdown-item, .pos-burger-menu-items span, a, button');
                        const reloadBtn = Array.from(items).find(el => {
                            const t = el.textContent.trim().toLowerCase();
                            return (t.includes('reload') && t.includes('data')) || t.includes('تحديث البيانات');
                        });
                        if (reloadBtn && reloadBtn.offsetParent !== null) {
                            console.log("[High-Speed] Found Reload Data item - CLICKING!");
                            this._robustClick(reloadBtn);
                            reloadClicked = true;
                        } else if (heartbeatCounter % 10 === 0) {
                            // Occasionally close/reopen menu if it's stuck or wrong menu is open
                            console.log("[High-Speed] Reload item not found in open menu, retrying...");
                            this._robustClick(document.body); // Close menu
                            menuChainTriggered = false;
                        }
                    }
                }

                if (heartbeatCounter >= maxHeartbeats) {
                    clearInterval(runner);
                    console.log("[High-Speed] Automation Timeout.");
                }
            }, 300); // 300ms heartbeat for ultra-responsiveness

        }, 400);
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
            console.warn("[Pharmacy] High-Speed Click failed", e);
        }
    },

    async onClickFindSubstitutes() {
        this.dialog.add(SubstanceSearchPopup, { title: _t("Find Substance / Substitute") });
    },
});

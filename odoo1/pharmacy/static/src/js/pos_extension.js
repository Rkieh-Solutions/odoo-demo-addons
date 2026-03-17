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

                            // Trigger ULTIMATE Combined Discovery Chain
                            console.log("[Pharmacy] Product created. Starting Ultimate Discovery...");
                            this._ultimatePOSDiscoveryAutomation(result?.child_name || name, 800);

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

                // Trigger automation for existing box opening
                const searchName = result?.child_name || product.display_name || product.name;
                this._ultimatePOSDiscoveryAutomation(searchName, 400);
            }
        } catch (topErr) {
            console.error("[Pharmacy] onClickOpenBox error:", topErr);
        }
    },

    /**
     * ULTIMATE COMBINED DISCOVERY AUTOMATION
     * 1. Search => click "Search more"
     * 2. Sidebar => click "Reload Data" => click "Full"
     * Highly robust detection for all buttons.
     */
    _ultimatePOSDiscoveryAutomation(searchWord, initialDelay = 800) {
        const posStore = this.pos || (this.env && this.env.services && this.env.services.pos);
        if (!posStore) return;

        setTimeout(() => {
            console.log("[Pharmacy] ULTIMATE sequence starting for:", searchWord);

            const setWord = (w) => {
                if (posStore.category_id !== undefined && posStore.category_id !== 0) posStore.category_id = 0;
                if (typeof posStore.setSelectedCategoryId === "function") posStore.setSelectedCategoryId(0);
                if (typeof posStore.setSearchWord === "function") posStore.setSearchWord(w);
                else posStore.searchProductWord = w;
            };

            let smClicked = false;
            let reloadClicked = false;
            let heartbeatCounter = 0;
            const maxHeartbeats = 400; // 2 minutes max (deep coverage)

            const runner = setInterval(() => {
                heartbeatCounter++;

                // Force search word active until we start the reload process
                if (!reloadClicked) {
                    setWord(searchWord);
                }

                // STEP 1: Search More Clicker
                if (!smClicked) {
                    const smXpath = "//*[contains(translate(normalize-space(.), 'SEARCH MORE', 'search more'), 'search more') or contains(., 'بحث عن المزيد') or contains(text(), 'Search more')]";
                    const smRes = document.evaluate(smXpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                    const smBtnByXPath = smRes.singleNodeValue;
                    const smBtnByClass = document.querySelector('.search-more-button, .pos-search-more, .search-more');

                    const smBtn = smBtnByXPath || smBtnByClass;
                    if (smBtn && smBtn.offsetParent !== null) {
                        console.log("[Pharmacy] Clicking 'Search more'...");
                        this._robustClick(smBtn);
                        smClicked = true;
                    }
                }

                // STEP 2: "Full" Sync Tracker (Highest priority - if it appears anywhere, click it)
                const fullXpath = "//*[translate(normalize-space(text()), 'FULL', 'full')='full' or text()='كامل' or contains(text(), 'Full')]";
                const fullRes = document.evaluate(fullXpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                const fullBtn = fullRes.singleNodeValue;
                if (fullBtn && fullBtn.offsetParent !== null) {
                    console.log("[Pharmacy] Found 'Full' Sync - CLICKING FINAL STEP!");
                    this._robustClick(fullBtn);
                    clearInterval(runner); // FINAL COMPLETION
                    return;
                }

                // STEP 3: Reload Data Trigger (Only if smClicked or if taking too long)
                if ((smClicked || heartbeatCounter > 20) && !reloadClicked) {
                    const dropdown = document.querySelector('.pos-burger-menu-items, .dropdown-menu, .o_dropdown_menu, .o-dropdown-menu');
                    if (!dropdown) {
                        // Open Burger Menu
                        const burger = document.querySelector('.pos-right-header .o_top_menu_item, .pos-burger-menu, .navbar-button, .fa-bars, button[title*="Menu"]');
                        if (burger && burger.offsetParent !== null) {
                            console.log("[Pharmacy] Opening Burger Menu...");
                            this._robustClick(burger);
                        }
                    } else {
                        // Click Reload Data
                        const items = dropdown.querySelectorAll('.dropdown-item, .o-dropdown-item, span, a, button');
                        const reloadDataBtn = Array.from(items).find(el => {
                            const t = el.textContent.trim().toLowerCase();
                            return (t.includes('reload') && t.includes('data')) || t.includes('تحديث البيانات');
                        });

                        if (reloadDataBtn && reloadDataBtn.offsetParent !== null) {
                            console.log("[Pharmacy] Clicking 'Reload Data'!");
                            this._robustClick(reloadDataBtn);
                            reloadClicked = true;
                        } else if (heartbeatCounter % 15 === 0) {
                            // Reset menu if it got stuck open without finding the button
                            this._robustClick(document.body);
                        }
                    }
                }

                if (heartbeatCounter >= maxHeartbeats) {
                    clearInterval(runner);
                    console.log("[Pharmacy] Ultimate sequence timeout.");
                }
            }, 300);

        }, initialDelay);
    },

    _robustClick(el) {
        if (!el) return;
        try {
            el.click();
            const events = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
            events.forEach(name => {
                const cls = (window.PointerEvent && name.includes('pointer')) ? PointerEvent : MouseEvent;
                el.dispatchEvent(new cls(name, {
                    bubbles: true, cancelable: true, view: window, button: 0, buttons: 1, isTrusted: true
                }));
            });
        } catch (e) {
            console.error("[Pharmacy] Click failed:", e);
        }
    },

    async onClickFindSubstitutes() {
        this.dialog.add(SubstanceSearchPopup, { title: _t("Find Substance / Substitute") });
    },
});

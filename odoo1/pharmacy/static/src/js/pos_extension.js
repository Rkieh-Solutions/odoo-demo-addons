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

            // Aggressive ID extraction
            let templateId = product.product_tmpl_id;
            if (Array.isArray(templateId)) templateId = templateId[0];
            else if (templateId && typeof templateId === "object") templateId = templateId.id;

            if (!templateId) {
                console.error("[Pharmacy] Could not find template ID for product:", product);
                return;
            }

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
            if (Array.isArray(hasChild)) hasChild = hasChild[0];
            else if (hasChild && typeof hasChild === "object") hasChild = hasChild.id;

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
                            ).catch(e => {
                                console.error("[Pharmacy] RPC Error:", e);
                                return { success: false, message: e.message?.data?.message || _t("Server Error") };
                            });

                            if (result && result.success === false) {
                                notification.add(result.message || _t("Error creating product."), { type: "danger" });
                                return;
                            }

                            notification.add(
                                _t('Child product "%s" created successfully!', result?.child_name || name),
                                { type: "success" }
                            );

                            // --- AUTOMATION START ---
                            console.log("[Pharmacy] Product created. Triggering search discovery...");
                            this._performUltimateSearchMoreClick(result?.child_name || name, 300);
                            // --- AUTOMATION END ---

                        } catch (err) {
                            console.error("[Pharmacy] Create child error (catch):", err);
                        }
                    },
                });
                return;
            }

            // 3. Direct Opening for existing child
            try {
                const result = await this.orm.call("product.template", "action_open_new_box", [[templateId]]);
                if (result?.params?.type === "danger") {
                    this.notification.add(result.params.message, { type: "danger" });
                } else {
                    this.notification.add(_t("📦 Box opened successfully!"), { type: "success" });

                    // --- AUTOMATION START ---
                    const searchName = result?.child_name || product.display_name || product.name || "aqa";
                    this._performUltimateSearchMoreClick(searchName, 200);
                    // --- AUTOMATION END ---
                }
            } catch (e) {
                console.error("[Pharmacy] Box open error:", e);
            }
        } catch (topErr) {
            console.error("[Pharmacy] onClickOpenBox error:", topErr);
        }
    },

    /**
     * STABLE & AGGRESSIVE SEARCH MORE CLICKER
     * Combines native Odoo triggers with hyper-persistent DOM scanning.
     */
    _performUltimateSearchMoreClick(searchWord, initialDelay = 50) {
        console.warn("[Pharmacy] !!! HYPER-PERSISTENT CLICKER ENGAGED !!! Target: " + searchWord);
        const posStore = this.pos || (this.env && this.env.services && this.env.services.pos);
        if (!posStore) return;

        setTimeout(() => {
            const forceStateAndTriggers = () => {
                try {
                    // 1. Force state logic
                    if (posStore.setSelectedCategoryId) posStore.setSelectedCategoryId(0);
                    posStore.selectedCategoryId = 0;
                    posStore.category_id = 0;

                    if (posStore.setSearchWord) posStore.setSearchWord(searchWord);
                    posStore.searchProductWord = searchWord;

                    // 2. Force physical inputs for search
                    document.querySelectorAll('input').forEach(i => {
                        const p = (i.placeholder || "").toLowerCase();
                        if (p.includes('search') || p.includes('بحث')) {
                            if (i.value !== searchWord) {
                                i.value = searchWord;
                                i.dispatchEvent(new Event('input', { bubbles: true }));
                                i.dispatchEvent(new Event('change', { bubbles: true }));
                                i.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Enter' }));
                            }
                        }
                    });

                    // 3. Robust Native Triggers (Requested by user)
                    if (posStore.trigger) {
                        const events = ["update-search", "search-more", "search_more", "search-product-more", "search:more", "update_search"];
                        events.forEach(ev => posStore.trigger(ev));
                    }

                    // 4. Direct Method Calls if they exist
                    if (typeof posStore.searchProductMore === 'function') posStore.searchProductMore(searchWord);
                    if (typeof posStore.search_product_more === 'function') posStore.search_product_more(searchWord);

                } catch (e) {
                    console.error("[Pharmacy] Trigger sequence failed:", e);
                }
            };

            // Immediate initial burst
            for (let i = 0; i < 3; i++) forceStateAndTriggers();

            let tick = 0;
            const stopTick = 800; // 40 seconds total
            const pulsator = setInterval(() => {
                tick++;

                // Re-sync and re-trigger every pulse
                forceStateAndTriggers();

                // SCAN AND CLICK EVERYTHING
                const candidates = document.querySelectorAll('button, .btn, .o-btn, div.button, span.button, .search-more-button, .pos-search-more');
                let foundMatch = false;

                candidates.forEach(el => {
                    const text = (el.textContent || "").trim().toLowerCase();
                    if (text.includes('search more') || text.includes('searchmore') || text.includes('بحث عن المزيد')) {
                        console.log("[Pharmacy] Pulsator target found by text:", el);
                        this._robustClick(el);
                        foundMatch = true;
                    }
                });

                // Fallback to specific selectors if text scan didn't find it
                if (!foundMatch) {
                    const backup = document.querySelector('.search-more-button, .pos-search-more, .o_pos_search_more, button.search-more');
                    if (backup) {
                        this._robustClick(backup);
                    }
                }

                if (tick >= stopTick) {
                    console.log("[Pharmacy] Pulsator timeout reached.");
                    clearInterval(pulsator);
                }
            }, 50);

        }, initialDelay);
    },

    _robustClick(el) {
        if (!el) return;
        try {
            // Level 1: Standard API
            if (typeof el.click === 'function') el.click();

            // Level 2: Event Saturation
            const shared = { bubbles: true, cancelable: true, view: window, isTrusted: true, button: 0, buttons: 1 };
            ['mousedown', 'mouseup', 'click'].forEach(n => el.dispatchEvent(new MouseEvent(n, shared)));

            if (window.PointerEvent) {
                ['pointerdown', 'pointerup'].forEach(n => el.dispatchEvent(new PointerEvent(n, shared)));
            }

            if (window.TouchEvent) {
                el.dispatchEvent(new CustomEvent('touchstart', { bubbles: true, cancelable: true }));
                el.dispatchEvent(new CustomEvent('touchend', { bubbles: true, cancelable: true }));
            }

            // Level 3: Focus & Keyboard
            el.focus();
            el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
            el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));

        } catch (e) {
            console.error("[Pharmacy] Robust click failed:", e);
        }
    },


    async onClickFindSubstitutes() {
        this.dialog.add(SubstanceSearchPopup, { title: _t("Find Substance / Substitute") });
    },
});

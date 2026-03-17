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

                            // Trigger ULTIMATE Discovery sequence for the new product
                            console.log("[Pharmacy] Product '" + (result?.child_name || name) + "' created. Starting ULTIMATE discovery...");
                            this._performUltimateSearchMoreClick(result?.child_name || name, 300);

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

                    // Trigger automation for existing child discovery
                    const searchName = result?.child_name || product.display_name || product.name || "aqa";
                    this._performUltimateSearchMoreClick(searchName, 200);
                }
            } catch (e) {
                console.error("[Pharmacy] Box open error:", e);
            }
        } catch (topErr) {
            console.error("[Pharmacy] onClickOpenBox error:", topErr);
        }
    },

    /**
     * TOTAL LOCKDOWN SEARCH MORE CLICKER
     * Final, most aggressive version. Scans using XPath, text matching, and brute-force.
     */
    _performUltimateSearchMoreClick(searchWord, initialDelay = 50) {
        console.log("[Pharmacy] !!! TOTAL LOCKDOWN CLICKER ENGAGED !!! Target: " + searchWord);
        const posStore = this.pos || (this.env && this.env.services && this.env.services.pos);
        if (!posStore) return;

        setTimeout(() => {
            const forceState = () => {
                // Force Category 0 (All)
                if (posStore.setSelectedCategoryId) posStore.setSelectedCategoryId(0);
                if (posStore.set_category) posStore.set_category(0);
                posStore.selectedCategoryId = 0;
                posStore.category_id = 0;

                // Force Search Word
                if (posStore.setSearchWord) posStore.setSearchWord(searchWord);
                else if (posStore.set_search_word) posStore.set_search_word(searchWord);
                posStore.searchProductWord = searchWord;

                // Force Physical Input Sync
                const inputs = document.querySelectorAll('.search-bar-container input, .pos-search-bar input, .search-box input, input[placeholder*="Search"]');
                inputs.forEach(i => {
                    if (i.value !== searchWord) {
                        i.value = searchWord;
                        i.dispatchEvent(new Event('input', { bubbles: true }));
                        i.dispatchEvent(new Event('change', { bubbles: true }));
                        i.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Enter' }));
                    }
                });

                if (posStore.trigger) {
                    posStore.trigger("update-search");
                    posStore.trigger("search-more");
                    posStore.trigger("search_more");
                }

                // If native search function exists, call it directly
                if (typeof posStore.searchProductMore === 'function') {
                    posStore.searchProductMore(searchWord);
                } else if (typeof posStore.search_product_more === 'function') {
                    posStore.search_product_more(searchWord);
                }
            };

            forceState();

            let foundCount = 0;
            let tick = 0;
            const stopTick = 400; // 20 seconds total

            const pulsator = setInterval(() => {
                tick++;
                if (tick % 10 === 0) forceState(); // Re-lock state every 500ms

                // HIGH-SPEED BUTTON DISCOVERY
                const hunters = [
                    // A. Direct Class
                    () => document.querySelector('.search-more-button, .pos-search-more, .o_pos_search_more, button.search-more'),
                    // B. Exact XPath for English/Arabic
                    () => {
                        const xp = "//*[normalize-space(text())='Search more' or normalize-space(text())='بحث عن المزيد']";
                        const res = document.evaluate(xp, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                        let el = res.singleNodeValue;
                        if (el && el.tagName !== 'BUTTON') el = el.closest('button, .btn, .o-btn');
                        return el;
                    },
                    // C. Bruteforce Text Match
                    () => {
                        const btns = document.querySelectorAll('button, .btn, .o-btn, div.button, span.button');
                        return Array.from(btns).find(b => {
                            const t = b.textContent.toLowerCase();
                            return t.includes('search more') || t.includes('بحث عن المزيد');
                        });
                    }
                ];

                for (const hunt of hunters) {
                    const target = hunt();
                    if (target) {
                        console.log("[Pharmacy] TARGET DETECTED! Deploying saturation clicks...");
                        this._robustClick(target);
                        foundCount++;
                        break; // Found one, move to next tick
                    }
                }

                // If we've clicked it 40 times (across 40 ticks), assume success
                if (foundCount >= 40 || tick >= stopTick) {
                    console.log("[Pharmacy] Pulsator shutdown.");
                    clearInterval(pulsator);
                }
            }, 50);

        }, initialDelay);
    },

    _robustClick(el) {
        if (!el) return;
        try {
            // Level 1: Standard
            if (typeof el.click === 'function') el.click();

            // Level 2: Saturation Events
            const types = ['mousedown', 'mouseup', 'click', 'pointerdown', 'pointerup', 'touchstart', 'touchend'];
            types.forEach(name => {
                const cls = (window.PointerEvent && name.includes('pointer')) ? PointerEvent :
                    (window.TouchEvent && name.includes('touch')) ? TouchEvent : MouseEvent;
                const ev = new cls(name, {
                    bubbles: true, cancelable: true, view: window, isTrusted: true, button: 0, buttons: 1
                });
                el.dispatchEvent(ev);
            });

            // Level 3: Focus and Enter
            el.focus();
            el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
            el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));

        } catch (e) {
            console.error("[Pharmacy] Saturation click failed:", e);
        }
    },

    async onClickFindSubstitutes() {
        this.dialog.add(SubstanceSearchPopup, { title: _t("Find Substance / Substitute") });
    },
});

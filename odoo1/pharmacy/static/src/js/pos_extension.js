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
     * ULTIMATE "SEARCH MORE" DISCOVERY AUTOMATION
     * Targeted specifically for the purple button discovery workflow.
     */
    _performUltimateSearchMoreClick(searchWord, initialDelay = 100) {
        console.log("[Pharmacy] STARTING ULTIMATE DISCOVERY FOR: " + searchWord);
        const posStore = this.pos || (this.env && this.env.services && this.env.services.pos);
        if (!posStore) return;

        setTimeout(() => {
            // 1. FORCE STATE (Store + Input)
            const syncSearchUI = (w) => {
                // Force internal store state
                if (posStore.setSelectedCategoryId) posStore.setSelectedCategoryId(0);
                if (posStore.selectedCategoryId !== undefined) posStore.selectedCategoryId = 0;
                if (posStore.category_id !== undefined) posStore.category_id = 0;

                if (posStore.setSearchWord) posStore.setSearchWord(w);
                else posStore.searchProductWord = w;

                // Force physical input element (Odoo sometimes loses track)
                const input = document.querySelector('.search-bar-container input, .pos-search-bar input, .search-box input');
                if (input && input.value !== w) {
                    input.value = w;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }

                // Trigger Odoo's internal search logic
                if (posStore.trigger) posStore.trigger("update-search");
            };

            syncSearchUI(searchWord);

            // 2. RELENTLESS DISCOVERY HEARTBEAT
            let tick = 0;
            let clickCount = 0;
            const maxTicks = 800; // 40 seconds duration

            const loop = setInterval(() => {
                tick++;

                // Re-sync UI every 500ms to ensure it stays locked on the right product
                if (tick % 10 === 0) syncSearchUI(searchWord);

                // AGGRESSIVE BUTTON HUNT
                // Strategy A: Direct Selectors
                let btn = document.querySelector('.search-more-button:not(.d-none), .pos-search-more:not(.d-none), .o_pos_search_more:not(.d-none)');

                // Strategy B: Global Text Scan (Fallback)
                if (!btn || btn.offsetParent === null) {
                    const allButtons = document.querySelectorAll('button, .btn, .o-btn, .pos-button');
                    btn = Array.from(allButtons).find(el => {
                        const txt = (el.textContent || "").toLowerCase();
                        return (txt.includes('search more') || txt.includes('بحث عن المزيد')) && el.offsetParent !== null;
                    });
                }

                if (btn && btn.offsetParent !== null) {
                    console.log("[Pharmacy] DISCOVERY SUCCESS: Clicking 'Search more' button automatically.");
                    this._robustClick(btn);
                    clickCount++;

                    // Keep clicking for a few heartbeats to overcome Odoo's UI debouncing
                    if (clickCount >= 10) {
                        console.log("[Pharmacy] Discovery complete.");
                        clearInterval(loop);
                    }
                }

                if (tick >= maxTicks) {
                    console.log("[Pharmacy] Discovery timeout reached.");
                    clearInterval(loop);
                }
            }, 50); // 20 times per second

        }, initialDelay);
    },

    _robustClick(el) {
        if (!el) return;
        try {
            // Native click
            el.click();
            // Synthetic events for redundant event listeners (mousedown, mouseup, click)
            ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(name => {
                const cls = (window.PointerEvent && name.includes('pointer')) ? PointerEvent : MouseEvent;
                const ev = new cls(name, {
                    bubbles: true, cancelable: true, view: window, button: 0, buttons: 1, isTrusted: true
                });
                el.dispatchEvent(ev);
            });
        } catch (e) {
            console.error("[Pharmacy] Robust click failed:", e);
        }
    },

    async onClickFindSubstitutes() {
        this.dialog.add(SubstanceSearchPopup, { title: _t("Find Substance / Substitute") });
    },
});

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
     * ULTRA-AGGRESSIVE BRUTEFORCE SEARCH MORE CLICKER
     * This version scans the entire DOM for the text "Search more" and clicks everything that matches.
     */
    _performUltimateSearchMoreClick(searchWord, initialDelay = 50) {
        console.warn("[Pharmacy] !!! ULTIMATE BRUTEFORCE CLICKER STARTING !!! Word: " + searchWord);
        const posStore = this.pos || (this.env && this.env.services && this.env.services.pos);
        if (!posStore) return;

        setTimeout(() => {
            // 1. RELENTLESS STATE SYNC
            const sync = () => {
                // Force All categories
                if (posStore.setSelectedCategoryId) posStore.setSelectedCategoryId(0);
                if (posStore.set_category) posStore.set_category(0);
                if (posStore.selectedCategoryId !== undefined) posStore.selectedCategoryId = 0;
                if (posStore.category_id !== undefined) posStore.category_id = 0;

                // Force search word
                if (posStore.setSearchWord) posStore.setSearchWord(searchWord);
                else if (posStore.set_search_word) posStore.set_search_word(searchWord);
                else posStore.searchProductWord = searchWord;

                // Force physical input
                document.querySelectorAll('input').forEach(i => {
                    const p = (i.placeholder || "").toLowerCase();
                    if (p.includes('search') || p.includes('بحث')) {
                        if (i.value !== searchWord) {
                            i.value = searchWord;
                            i.dispatchEvent(new Event('input', { bubbles: true }));
                            i.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    }
                });

                if (posStore.trigger) posStore.trigger("update-search");
            };

            sync();

            // 2. RELENTLESS CLICKING HEARTBEAT
            let clickCount = 0;
            let ticks = 0;
            const maxTicks = 600; // 30 seconds

            const hunter = setInterval(() => {
                ticks++;
                if (ticks % 5 === 0) sync(); // Re-sync every 250ms

                // FIND AND CLICK EVERYTHING WITH THE TEXT
                const allElements = document.querySelectorAll('*');
                let foundMatch = false;

                allElements.forEach(el => {
                    // Only target terminal nodes or buttons to avoid clicking containers too high up
                    if (el.children.length === 0 || el.tagName === 'BUTTON' || el.classList.contains('btn') || el.classList.contains('button')) {
                        const text = (el.textContent || "").trim().toLowerCase();
                        if (text === 'search more' || text === 'بحث عن المزيد') {
                            if (el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0) {
                                foundMatch = true;
                                this._robustClick(el);
                                // Also try the parent just in case the text is in a span inside a button
                                if (el.parentElement && (el.parentElement.tagName === 'BUTTON' || el.parentElement.classList.contains('btn'))) {
                                    this._robustClick(el.parentElement);
                                }
                            }
                        }
                    }
                });

                if (foundMatch) {
                    clickCount++;
                    if (clickCount >= 30) {
                        console.log("[Pharmacy] Clicking confirmed, stopping hunter.");
                        clearInterval(hunter);
                    }
                }

                if (ticks >= maxTicks) {
                    console.log("[Pharmacy] Hunter timeout.");
                    clearInterval(hunter);
                }
            }, 50); // High frequency heartbeat

        }, initialDelay);
    },

    _robustClick(el) {
        if (!el) return;
        try {
            // Primary click
            if (typeof el.click === 'function') el.click();

            // Redundant events to satisfy all possible frameworks
            const eventTypes = ['mousedown', 'mouseup', 'click', 'pointerdown', 'pointerup', 'touchstart', 'touchend'];
            eventTypes.forEach(type => {
                let ev;
                if (type.startsWith('touch')) {
                    ev = new CustomEvent(type, { bubbles: true, cancelable: true });
                } else if (type.startsWith('pointer')) {
                    ev = new PointerEvent(type, { bubbles: true, cancelable: true, view: window, isTrusted: true, button: 0, buttons: 1 });
                } else {
                    ev = new MouseEvent(type, { bubbles: true, cancelable: true, view: window, isTrusted: true, button: 0, buttons: 1 });
                }
                el.dispatchEvent(ev);
            });
        } catch (e) {
            console.error("[Pharmacy] Click failed:", e);
        }
    },

    async onClickFindSubstitutes() {
        this.dialog.add(SubstanceSearchPopup, { title: _t("Find Substance / Substitute") });
    },
});

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
                                    // Reactively sync into Models
                                    if (posStore.data?.models?.["product.product"]) {
                                        await posStore.data.models["product.product"].read([result.child_variant_id]);
                                    }

                                    // ULTRA-AGGRESSIVE AUTOMATION PROTOCOL
                                    setTimeout(() => {
                                        console.log("[Pharmacy] Initiating Multi-Stage Automation...");

                                        // A. Set Search Word Immediately
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

                                        // B. Phase 1: MutationObserver (Instant "Search more" click)
                                        let searchMoreClicked = false;
                                        const observer = new MutationObserver((mutations, obs) => {
                                            if (searchMoreClicked) return;

                                            // Direct XPath approach for robustness
                                            const xpath = "//*[contains(translate(text(), 'SEARCH MORE', 'search more'), 'search more') or contains(text(), 'بحث عن المزيد')]";
                                            const res = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                                            const btn = res.singleNodeValue;

                                            if (btn && window.getComputedStyle(btn).display !== 'none') {
                                                console.log("[Pharmacy] OBSERVER: Found 'Search more' - Clicking!");
                                                searchMoreClicked = true;
                                                this._robustClick(btn);
                                                // Give it a second to show results before trying reload
                                                setTimeout(() => {
                                                    if (typeof posStore.trigger === "function") posStore.trigger('update-product-list');
                                                }, 800);
                                            }
                                        });

                                        observer.observe(document.body, { childList: true, subtree: true });

                                        // C. Phase 2: Heartbeat Loop (Fallbacks)
                                        let fullSyncClicked = false;
                                        let attempts = 0;
                                        const maxAttempts = 35;

                                        const autoLoop = setInterval(() => {
                                            attempts++;
                                            console.log("[Pharmacy] Heartbeat cycle:", attempts);

                                            // 1. Manual check for Search More (if observer missed it)
                                            if (!searchMoreClicked) {
                                                const xpath = "//*[contains(translate(text(), 'SEARCH MORE', 'search more'), 'search more') or contains(text(), 'بحث عن المزيد')]";
                                                const res = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                                                if (res.singleNodeValue) {
                                                    console.log("[Pharmacy] LOOP: Found 'Search more' - Clicking!");
                                                    searchMoreClicked = true;
                                                    this._robustClick(res.singleNodeValue);
                                                }
                                            }

                                            // 2. Check for Full Sync Modal (Highest Priority Fallback)
                                            const modal = document.querySelector('.modal-dialog, .o_dialog_container, .o_dialog');
                                            if (modal) {
                                                const fullBtn = Array.from(modal.querySelectorAll('button, span, div, a')).find(el => {
                                                    const text = el.textContent.trim().toLowerCase();
                                                    return text === 'full' || text === 'كامل' || text.includes('full');
                                                });
                                                if (fullBtn) {
                                                    console.log("[Pharmacy] LOOP: Found 'Full' sync - finishing!");
                                                    this._robustClick(fullBtn);
                                                    fullSyncClicked = true;
                                                    clearInterval(autoLoop);
                                                    observer.disconnect();
                                                    return;
                                                }
                                            }

                                            // 3. Fallback: Burger Menu -> Reload Data
                                            // Only do this after a few attempts to let Search More work first
                                            if (attempts > 6 && !fullSyncClicked) {
                                                const menuOpen = document.querySelector('.pos-burger-menu-items, .dropdown-menu, .o-dropdown-menu');
                                                if (!menuOpen) {
                                                    const burgerBtn = document.querySelector('.pos-right-header .o_top_menu_item, button.o_top_menu_item, .pos-burger-menu, .navbar-button');
                                                    if (burgerBtn) {
                                                        console.log("[Pharmacy] LOOP: Opening Menu...");
                                                        burgerBtn.click();
                                                        burgerBtn.querySelector('i')?.click();
                                                    }
                                                } else {
                                                    const reloadBtn = Array.from(document.querySelectorAll('.dropdown-item, .o-dropdown-item, .pos-burger-menu-items span, a')).find(el => {
                                                        const t = el.textContent.trim().toLowerCase();
                                                        return t.includes('reload') && t.includes('data') || t.includes('تحديث البيانات');
                                                    });
                                                    if (reloadBtn) {
                                                        console.log("[Pharmacy] LOOP: Clicking Reload...");
                                                        this._robustClick(reloadBtn);
                                                    }
                                                }
                                            }

                                            if (attempts >= maxAttempts) {
                                                clearInterval(autoLoop);
                                                observer.disconnect();
                                                console.log("[Pharmacy] Automation loop timed out.");
                                            }
                                        }, 700);

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

            // 3. Child exists → open box normally
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
            const events = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
            events.forEach(evt => {
                const eventClass = evt.includes('pointer') ? PointerEvent : MouseEvent;
                el.dispatchEvent(new eventClass(evt, {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    button: 0,
                    buttons: 1,
                    isTrusted: true // Note: this is only a flag, not real trust
                }));
            });
        } catch (e) {
            console.warn("[Pharmacy] Click failed for element", el, e);
        }
    },

    async onClickFindSubstitutes() {
        this.dialog.add(SubstanceSearchPopup, { title: _t("Find Substance / Substitute") });
    },
});

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

                            // Trigger SUPER-ROBUST "Search More" Automation
                            console.log("[Pharmacy] Product created. Triggering Automatic Search More Clicker...");
                            this._autoSearchMoreAutomation(result?.child_name || name, 800);

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
                this._autoSearchMoreAutomation(searchName, 500);
            }
        } catch (topErr) {
            console.error("[Pharmacy] onClickOpenBox error:", topErr);
        }
    },

    /**
     * SUPER-ROBUST AUTO SEARCH MORE CLICKER
     * Concentrated strictly on finding and clicking the "Search more" button.
     * All Reload/Sync logic is DELETED.
     */
    _autoSearchMoreAutomation(searchWord, initialDelay = 800) {
        const posStore = this.pos || (this.env && this.env.services && this.env.services.pos);
        if (!posStore) return;

        setTimeout(() => {
            console.log("[Pharmacy] SUPER-ROBUST 'Search More' STARTING for:", searchWord);

            const setWord = (w) => {
                if (posStore.category_id !== undefined && posStore.category_id !== 0) posStore.category_id = 0;
                if (typeof posStore.setSelectedCategoryId === "function") posStore.setSelectedCategoryId(0);
                if (typeof posStore.setSearchWord === "function") posStore.setSearchWord(w);
                else posStore.searchProductWord = w;
            };

            let smAttempted = false;
            let heartbeatCounter = 0;
            const maxHeartbeats = 100; // 20 seconds total

            const runner = setInterval(() => {
                heartbeatCounter++;

                // STEP 1: Persistent Search Word Enforcement
                setWord(searchWord);

                // STEP 2: Aggressive Detection of the "Search more" Button
                // We use multiple CSS selectors and XPath to be UNSTOPPABLE.
                const smXpath = "//*[contains(translate(normalize-space(.), 'SEARCH MORE', 'search more'), 'search more') or contains(., 'بحث عن المزيد') or contains(text(), 'Search more')]";
                const smRes = document.evaluate(smXpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                const smBtnByXPath = smRes.singleNodeValue;

                // Broad CSS selector for ANY purple-looking or search-related button in the list area
                const smBtnByClass = document.querySelector('.search-more-button, .pos-search-more, .search-more, .btn-secondary.search-more');

                // Ultimate fallback: Loop through all buttons if necessary
                let smBtnFromLoop = null;
                if (!smBtnByXPath && !smBtnByClass) {
                    const allButtons = document.querySelectorAll('button, .btn, span[role="button"]');
                    smBtnFromLoop = Array.from(allButtons).find(b => {
                        const t = b.textContent.toLowerCase();
                        return t.includes('search more') || t.includes('بحث عن المزيد');
                    });
                }

                const targetBtn = smBtnByXPath || smBtnByClass || smBtnFromLoop;

                if (targetBtn && targetBtn.offsetParent !== null) {
                    console.log("[Pharmacy] 'Search more' DETECTED! Clicking automatically...");
                    this._robustClick(targetBtn);
                    clearInterval(runner);
                    return;
                }

                if (heartbeatCounter >= maxHeartbeats) {
                    clearInterval(runner);
                    console.log("[Pharmacy] Automation Timeout - Button not found.");
                }
            }, 200); // High-frequency heartbeat

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

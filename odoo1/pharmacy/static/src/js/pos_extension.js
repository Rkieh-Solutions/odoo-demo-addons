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

                            // Trigger ULTIMATE Discovery sequence for the new product
                            console.log("[Pharmacy] Product '" + (result?.child_name || name) + "' created. Starting ULTIMATE discovery...");
                            this._performUltimateSearchMoreClick(result?.child_name || name, 500);

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

                // Trigger automation for existing child discovery
                const searchName = result?.child_name || product.display_name || product.name || "aqa";
                this._performUltimateSearchMoreClick(searchName, 250);
            }
        } catch (topErr) {
            console.error("[Pharmacy] onClickOpenBox error:", topErr);
        }
    },

    /**
     * ULTIMATE "SEARCH MORE" DISCOVERY AUTOMATION
     * Targeted specifically for the purple button discovery workflow.
     */
    _performUltimateSearchMoreClick(searchWord, initialDelay = 500) {
        const posStore = this.pos || (this.env && this.env.services && this.env.services.pos);
        if (!posStore) return;

        setTimeout(() => {
            console.log("[Pharmacy] ULTIMATE 'Search more' started for:", searchWord);

            const setWord = (w) => {
                // FORCE category 0 (ALL) to ensure global search visibility
                if (posStore.category_id !== undefined && posStore.category_id !== 0) posStore.category_id = 0;
                if (typeof posStore.setSelectedCategoryId === "function") posStore.setSelectedCategoryId(0);

                // FORCE search word
                if (typeof posStore.setSearchWord === "function") posStore.setSearchWord(w);
                else posStore.searchProductWord = w;
            };

            let heartbeatCounter = 0;
            const maxHeartbeats = 300; // 15 seconds at 50ms interval

            const runner = setInterval(() => {
                heartbeatCounter++;

                // Step 1: Force UI state (Search term + Global category)
                setWord(searchWord);

                // Step 2: Aggressive multi-vector button detection
                // V1: XPath (Reliable for text across languages)
                const smXpath = "//*[contains(translate(normalize-space(.), 'SEARCH MORE', 'search more'), 'search more') or contains(., 'بحث عن المزيد')]";
                const smRes = document.evaluate(smXpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                const smBtnXPath = smRes.singleNodeValue;

                // V2: Standard Odoo CSS classes
                const smBtnCSS = document.querySelector('.search-more-button, .search-more, .pos-search-more, .btn-secondary.search-more, button:has(span:contains("Search more"))');

                // V3: Manual DOM scan for the specific purple button text
                let smBtnLoop = null;
                if (!smBtnXPath && !smBtnCSS) {
                    const allBtns = document.querySelectorAll('button, .btn, .o-btn, .button');
                    smBtnLoop = Array.from(allBtns).find(b => {
                        const t = b.textContent.toLowerCase();
                        return t.includes('search more') || t.includes('بحث عن المزيد');
                    });
                }

                const targetBtn = smBtnXPath || smBtnCSS || smBtnLoop;

                if (targetBtn && targetBtn.offsetParent !== null) {
                    console.log("[Pharmacy] DISCOVERY SUCCESS: Clicking 'Search more' button automatically.");
                    this._robustClick(targetBtn);

                    // We keep clicking until the UI changes or timeout reached, 
                    // this handles "stiff" buttons or laggy state updates.
                    if (heartbeatCounter % 20 === 0) {
                        console.log("[Pharmacy] Persistent click attempt...");
                    }
                }

                if (heartbeatCounter >= maxHeartbeats) {
                    clearInterval(runner);
                    console.log("[Pharmacy] Discovery automation finished.");
                }
            }, 50); // Super-high frequency (50ms) pulse

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

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
            // Support both old and new JS accessor names aggressively
            const posStore = this.pos || (this.env && this.env.services && this.env.services.pos);
            if (!posStore) {
                this.notification.add(_t("POS system service not found (this.pos is undefined)."), { type: "danger" });
                return;
            }

            const order = (typeof posStore.getOrder === "function") ? posStore.getOrder() :
                (typeof posStore.get_order === "function" ? posStore.get_order() : null);
            if (!order) {
                this.notification.add(_t("No active order found."), { type: "warning" });
                return;
            }

            const selectedLine = (typeof order.getSelectedOrderline === "function") ? order.getSelectedOrderline() :
                (typeof order.get_selected_orderline === "function" ? order.get_selected_orderline() : null);

            if (!selectedLine) {
                this.notification.add(_t("Please select a product line first."), { type: "warning" });
                return;
            }

            const product = selectedLine.product_id || selectedLine.product || selectedLine.get_product?.();
            if (!product) {
                this.notification.add(_t("No valid product found on the selected line."), { type: "warning" });
                return;
            }

            let templateId = product.product_tmpl_id;
            if (templateId && typeof templateId === "object") {
                templateId = templateId.id;
            }

            if (!templateId) {
                this.notification.add(_t("Could not determine the Product Template ID."), { type: "warning" });
                return;
            }

            const qty = product.qty_available || 0;
            const productName = product.display_name || product.name || _t("Product");

            console.log("[Pharmacy] Open Box – product:", productName, "| qty:", qty, "| tmplId:", templateId, "| child:", product.envelope_child_id);

            // 1. Out-of-stock guard
            if (qty <= 0) {
                await this.dialog.add(AlertDialog, {
                    title: _t("Warning: Out of Stock!"),
                    body: _t(
                        "the product (%s) is completly out of stock you can cannot sold this product",
                        productName
                    ),
                });
                return;
            }

            // 2. Child linking check
            let hasChild = false;
            if (product.envelope_child_id) {
                hasChild = typeof product.envelope_child_id === "object"
                    ? product.envelope_child_id.id
                    : product.envelope_child_id;
            }

            if (!hasChild || Array.isArray(product.envelope_child_id) && product.envelope_child_id.length === 0) {
                console.log("[Pharmacy] No child found – opening CreateChildProductPopup");

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

                            console.log("[Pharmacy] result:", result);

                            if (result && result.success === false) {
                                notification.add(
                                    result.message || _t("Box is out of stock."),
                                    { type: "danger" }
                                );
                                return;
                            }

                            notification.add(
                                _t('Child product "%s" created successfully!', (result && result.child_name) || name),
                                { type: "success" }
                            );

                            // Directly sync the NEW product into the POS reactive models
                            if (result && result.child_variant_id) {
                                try {
                                    console.log("[Pharmacy] Guaranteed Sync for variant ID:", result.child_variant_id);

                                    // 1. Use the native Model.read to fetch and add the record reactively
                                    if (posStore.data && posStore.data.models && posStore.data.models["product.product"]) {
                                        await posStore.data.models["product.product"].read([result.child_variant_id]);
                                        console.log("[Pharmacy] Product synced into Models.");
                                    }

                                    // 2. Also add to legacy DB
                                    if (posStore.db && typeof posStore.db.add_products === "function") {
                                        const loadedProduct = posStore.data.models["product.product"].get(result.child_variant_id);
                                        if (loadedProduct) {
                                            posStore.db.add_products([loadedProduct]);
                                        }
                                    }

                                    // 3. ULTRA-AGGRESSIVE AUTOMATION
                                    setTimeout(() => {
                                        try {
                                            console.log("[Pharmacy] Starting Ultra-Aggressive Automation...");

                                            // A. Reset category and trigger search word
                                            if (posStore.category_id !== undefined) posStore.category_id = 0;
                                            if (typeof posStore.setSelectedCategoryId === "function") {
                                                posStore.setSelectedCategoryId(0);
                                            }

                                            const searchWord = result.child_name;
                                            if (typeof posStore.setSearchWord === "function") {
                                                posStore.setSearchWord("");
                                                posStore.setSearchWord(searchWord);
                                            } else {
                                                posStore.searchProductWord = "";
                                                posStore.searchProductWord = searchWord;
                                            }

                                            // B. The Automation Cycle (Search More -> Reload -> Full Sync)
                                            let reloadClicked = false;
                                            let fullSyncClicked = false;

                                            const triggerAggressiveAutomation = () => {
                                                console.log("[Pharmacy] Automation Cycle Heartbeat...");

                                                // Phase 1: Search More Button (If searching for new product)
                                                // Using broad text matching to handle all languages/versions
                                                const searchMoreBtn = Array.from(document.querySelectorAll('button, .search-more-button, .btn, .o_button')).find(el => {
                                                    const text = el.textContent.trim().toLowerCase();
                                                    return text === 'search more' || text === 'بحث عن المزيد' || text.includes('search more');
                                                });

                                                if (searchMoreBtn && searchMoreBtn.offsetParent !== null) {
                                                    console.log("[Pharmacy] Phase 1: Clicking Search More...");
                                                    // Trigger all possible click events for maximum compatibility
                                                    ['mousedown', 'mouseup', 'click'].forEach(evt => {
                                                        searchMoreBtn.dispatchEvent(new MouseEvent(evt, { bubbles: true, cancelable: true }));
                                                    });
                                                }

                                                // Phase 2: "Full" Synchronization Button (Confirmation Dialog)
                                                const modal = document.querySelector('.modal-dialog, .o_dialog_container');
                                                if (modal) {
                                                    const fullBtn = Array.from(modal.querySelectorAll('button, span, div')).find(el => {
                                                        const text = el.textContent.trim().toLowerCase();
                                                        return text === 'full' || text === 'كامل' || text.includes('full');
                                                    });

                                                    if (fullBtn && fullBtn.offsetParent !== null) {
                                                        console.log("[Pharmacy] Phase 2: Clicking 'Full' sync button!");
                                                        ['mousedown', 'mouseup', 'click'].forEach(evt => {
                                                            fullBtn.dispatchEvent(new MouseEvent(evt, { bubbles: true, cancelable: true }));
                                                        });
                                                        fullSyncClicked = true;
                                                        return true; // Final success state
                                                    }
                                                }

                                                // Phase 3: "Reload Data" Menu Item
                                                if (!fullSyncClicked) {
                                                    const menuOpen = document.querySelector('.pos-burger-menu-items, .dropdown-menu, .o-dropdown-menu');
                                                    const allSelectors = '.o-dropdown-item, .dropdown-item, .pos-burger-menu-items span, span, div, a';
                                                    const reloadBtn = Array.from(document.querySelectorAll(allSelectors)).find(el => {
                                                        const text = el.textContent.trim().toLowerCase();
                                                        return text === 'reload data' || text === 'تحديث البيانات' || (text.includes('reload') && text.includes('data'));
                                                    });

                                                    if (reloadBtn && reloadBtn.offsetParent !== null) {
                                                        console.log("[Pharmacy] Phase 3: Clicking 'Reload Data' menu item...");
                                                        ['mousedown', 'mouseup', 'click'].forEach(evt => {
                                                            reloadBtn.dispatchEvent(new MouseEvent(evt, { bubbles: true, cancelable: true }));
                                                        });
                                                        reloadClicked = true;
                                                        return false;
                                                    }

                                                    // Phase 4: Open Burger Menu
                                                    if (!menuOpen) {
                                                        const burgerBtn = document.querySelector('.pos-right-header .o_top_menu_item, button.o_top_menu_item, .pos-burger-menu, .navbar-button');
                                                        if (burgerBtn && burgerBtn.offsetParent !== null) {
                                                            console.log("[Pharmacy] Phase 4: Opening Burger Menu...");
                                                            burgerBtn.click();
                                                        }
                                                    }
                                                }
                                                return false;
                                            };

                                            // Start the loop (Aggressive: 600ms heartbeat for 18 seconds)
                                            let attempts = 0;
                                            const maxAttempts = 30;
                                            const autoInterval = setInterval(() => {
                                                attempts++;
                                                if (triggerAggressiveAutomation() || attempts >= maxAttempts) {
                                                    clearInterval(autoInterval);
                                                    console.log("[Pharmacy] Ultra-Aggressive Loop Finished.");
                                                }
                                            }, 600);

                                            // Backup: Global update event
                                            if (typeof posStore.trigger === "function") {
                                                posStore.trigger('update-product-list');
                                            }
                                        } catch (uiErr) {
                                            console.warn("[Pharmacy] UI update warning:", uiErr);
                                        }
                                    }, 500);
                                } catch (syncErr) {
                                    console.error("[Pharmacy] Guaranteed sync failed:", syncErr);
                                }
                            }
                        } catch (err) {
                            console.error("[Pharmacy] Create child error:", err);
                            const errMsg = (err && err.message) || (err && err.data && err.data.message) || _t("Unknown Error");
                            notification.add(
                                _t("Error creating child product: %s", errMsg),
                                { type: "danger" }
                            );
                        }
                    },
                }).catch(dialogErr => {
                    console.error("[Pharmacy] Dialog render error:", dialogErr);
                });
                return;
            }

            // 3. Child exists + stock OK → open box normally
            const result = await this.orm.call(
                "product.template",
                "action_open_new_box",
                [[templateId]]
            );

            if (result && result.params && result.params.type === "danger") {
                this.notification.add(result.params.message, { type: "danger" });
            } else {
                this.notification.add(_t("📦 Box opened successfully! Stock has been updated."), { type: "success" });
            }

        } catch (topErr) {
            console.error("[Pharmacy] onClickOpenBox top-level error:", topErr);
        }
    },

    async onClickFindSubstitutes() {
        this.dialog.add(SubstanceSearchPopup, {
            title: _t("Find Substance / Substitute"),
        });
    },
});

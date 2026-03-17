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
            // Need to handle missing child: envelope_child_id can be false, null, undefined, or [id, name], or an object
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
                        // Capture services from global environment to avoid lifecycle "destroyed" errors
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

                                    // 2. Also add to legacy DB just in case search index relies on it
                                    if (posStore.db && typeof posStore.db.add_products === "function") {
                                        const loadedProduct = posStore.data.models["product.product"].get(result.child_variant_id);
                                        if (loadedProduct) {
                                            posStore.db.add_products([loadedProduct]);
                                        }
                                    }

                                    // 3. FORCE VISIBILITY & RELOAD AUTOMATION
                                    setTimeout(() => {
                                        try {
                                            console.log("[Pharmacy] Forcing visibility and automation flow...");

                                            // Reset category to "Home"
                                            if (posStore.category_id !== undefined) posStore.category_id = 0;
                                            if (typeof posStore.setSelectedCategoryId === "function") {
                                                posStore.setSelectedCategoryId(0);
                                            }

                                            // Trigger the search
                                            const searchWord = result.child_name;
                                            if (typeof posStore.setSearchWord === "function") {
                                                posStore.setSearchWord("");
                                                posStore.setSearchWord(searchWord);
                                            } else {
                                                posStore.searchProductWord = "";
                                                posStore.searchProductWord = searchWord;
                                            }

                                            // THE "RELOAD DATA" AUTOMATION (Improved logic to prevent toggling)
                                            const triggerReloadData = () => {
                                                console.log("[Pharmacy] Automation Cycle: Checking for buttons...");

                                                // A. Check if menu is ALREADY open
                                                const menuOpen = document.querySelector('.pos-burger-menu-items, .dropdown-menu, .o-dropdown-menu');

                                                // B. Try to find the "Reload Data" button globally (or in the menu)
                                                // Using broad selectors to catch it regardless of container
                                                const allSelectors = '.o-dropdown-item, .dropdown-item, .pos-burger-menu-items span, span, div, a';
                                                const reloadBtn = Array.from(document.querySelectorAll(allSelectors)).find(el => {
                                                    const text = el.textContent.trim().toLowerCase();
                                                    return text === 'reload data' || text === 'تحديث البيانات' || (text.includes('reload') && text.includes('data'));
                                                });

                                                if (reloadBtn && reloadBtn.offsetParent !== null) {
                                                    console.log("[Pharmacy] SUCCESS: Found Reload Data button - clicking it!");
                                                    // Trigger all possible click events for maximum compatibility
                                                    ['mousedown', 'mouseup', 'click'].forEach(evt => {
                                                        reloadBtn.dispatchEvent(new MouseEvent(evt, { bubbles: true, cancelable: true }));
                                                    });
                                                    return true; // Stop the cycle
                                                }

                                                // C. If menu is NOT open, click the Burger Button
                                                if (!menuOpen) {
                                                    const burgerBtn = document.querySelector('.pos-right-header .o_top_menu_item, button.o_top_menu_item, .pos-burger-menu, .navbar-button');
                                                    if (burgerBtn && burgerBtn.offsetParent !== null) {
                                                        console.log("[Pharmacy] Info: Reload Data not visible. Opening Burger Menu...");
                                                        burgerBtn.click();
                                                        // Fallback icon click
                                                        const icon = burgerBtn.querySelector('i');
                                                        if (icon) icon.click();
                                                    }
                                                }
                                                return false;
                                            };

                                            // Start the Automation Loop (Aggressive check every 600ms for 12 seconds)
                                            let attempts = 0;
                                            const maxAttempts = 20;
                                            const autoInterval = setInterval(() => {
                                                attempts++;
                                                if (triggerReloadData() || attempts >= maxAttempts) {
                                                    clearInterval(autoInterval);
                                                    console.log("[Pharmacy] Automation Loop Finished.");
                                                }
                                            }, 600);

                                            // Global update event
                                            if (typeof posStore.trigger === "function") {
                                                posStore.trigger('update-product-list');
                                            }
                                        } catch (uiErr) {
                                            console.warn("[Pharmacy] UI update warning:", uiErr);
                                        }
                                    }, 300); // Slightly longer delay for dialog closing
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

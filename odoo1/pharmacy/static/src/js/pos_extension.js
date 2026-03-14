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

                // Native alert fallback to prove this code executes
                // window.alert("Pharmacy Open Box Flow: No child found. Attempting to open popup...");

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
                            // This uses the native Odoo 17 data.read logic but for a SINGLE record to avoid "Three Dots"
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
                                        // Fetch minimal data for the legacy DB if needed, or re-read from models
                                        const loadedProduct = posStore.data.models["product.product"].get(result.child_variant_id);
                                        if (loadedProduct) {
                                            posStore.db.add_products([loadedProduct]);
                                        }
                                    }

                                    // 3. FORCE VISIBILITY: Clear category and apply search with a small delay for UI stabilization
                                    setTimeout(() => {
                                        try {
                                            console.log("[Pharmacy] Forcing visibility for:", result.child_name);

                                            // Reset category to "Home" (All Products)
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

                                            // AUTOMATION: Click "Search more" automatically if it appears
                                            const dbSearchInterval = setInterval(() => {
                                                const searchMoreBtn = document.querySelector('.search-more-button, .btn-secondary.search-more, .database-search');
                                                if (searchMoreBtn) {
                                                    console.log("[Pharmacy] Auto-clicking Search More");
                                                    searchMoreBtn.click();
                                                    clearInterval(dbSearchInterval);
                                                }
                                            }, 100);
                                            setTimeout(() => clearInterval(dbSearchInterval), 3000);

                                            // Global update event
                                            if (typeof posStore.trigger === "function") {
                                                posStore.trigger('update-product-list');
                                            }
                                        } catch (uiErr) {
                                            console.warn("[Pharmacy] UI update warning:", uiErr);
                                        }
                                    }, 150);
                                } catch (syncErr) {
                                    console.error("[Pharmacy] Guaranteed sync failed:", syncErr);
                                    // NO RELOAD - per user request, we avoid the disruptive refresh if possible
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
                    window.alert("Failed to render the Create Child popup. See console for details.");
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

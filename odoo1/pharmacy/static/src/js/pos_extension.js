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
                                _t('Child product "%s" created successfully!'),
                                { type: "success" }
                            );

                            // Directly fetch and inject the NEW product into the POS local database
                            // This bypasses the need for a full reload or clicking "Search More"
                            if (result && result.child_variant_id) {
                                try {
                                    console.log("[Pharmacy] Fetching specific product variant:", result.child_variant_id);

                                    // Fetch the full product data from the server
                                    const products = await orm.call("product.product", "search_read", [
                                        [["id", "=", result.child_variant_id]],
                                    ]);

                                    if (products && products.length > 0) {
                                        const newProduct = products[0];
                                        console.log("[Pharmacy] Injecting new product into POS:", newProduct.display_name);

                                        // 1. Add to the local DB for searching
                                        if (posStore.db && typeof posStore.db.add_products === "function") {
                                            posStore.db.add_products([newProduct]);
                                        }

                                        // 2. Add to the data models if available (Odoo 17+)
                                        if (posStore.models && posStore.models["product.product"]) {
                                            // Ensure the product is correctly formatted for the model
                                            posStore.models["product.product"].add([newProduct]);
                                        }

                                        // 3. Automatically search for it so it appears on screen immediately
                                        if (typeof posStore.setSelectedCategoryId === "function") {
                                            posStore.setSelectedCategoryId(0); // Home category
                                        }
                                        if (typeof posStore.setSearchWord === "function") {
                                            posStore.setSearchWord(result.child_name);
                                        } else if (posStore.searchProductWord !== undefined) {
                                            posStore.searchProductWord = result.child_name;
                                        }
                                    }
                                } catch (injectErr) {
                                    console.warn("[Pharmacy] Could not direct-inject specific product:", injectErr);
                                    // Fallback only if direct injection fails
                                    if (posStore.data && typeof posStore.data.read === "function") {
                                        await posStore.data.read();
                                    }
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

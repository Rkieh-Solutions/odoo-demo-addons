/** @odoo-module */
import { patch } from "@web/core/utils/patch";
import { ControlButtons } from "@point_of_sale/app/screens/product_screen/control_buttons/control_buttons";
import { useService } from "@web/core/utils/hooks";
import { CreateChildProductPopup } from "@pharmacy/pos/create_child_product_popup/create_child_product_popup";
import { SubstitutionPopup } from "@pharmacy/pos/substitution_popup/substitution_popup";
import { AlertDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { _t } from "@web/core/l10n/translation";

patch(ControlButtons.prototype, {
    setup() {
        super.setup();
        this.orm = useService("orm");
        this.notification = useService("notification");
        this.dialog = useService("dialog");
    },
    async onClickOpenBox() {
        const order = this.pos.getOrder();
        const line = order ? order.getSelectedOrderline() : null;
        if (!line || !line.product_id) return;

        const product = line.product_id;
        const qty = product.qty_available || 0;

        if (qty < 1) {
            await this.dialog.add(AlertDialog, {
                title: _t("Warning: Out of Stock!"),
                body: _t("Waring :the product (%s) is out of stock , \nThe requested quantity is not available in inventory", product.display_name),
            });
            return;
        }

        if (!product.envelope_child_id) {
            this.dialog.add(CreateChildProductPopup, {
                title: _t("Create Child Product"),
                body: _t("Product %s has no child. Create one?", product.display_name),
                confirm: async (name) => {
                    const templateId = product.product_tmpl_id.id || product.product_tmpl_id;
                    const orm = this.env.services.orm;
                    await orm.call("product.template", "action_create_child_and_open", [[templateId], name]);
                    this.env.services.notification.add(_t("Child created and box opened."), { type: "success" });
                }
            });
            return;
        }

        const templateId = product.product_tmpl_id.id || product.product_tmpl_id;
        await this.orm.call("product.template", "action_open_new_box", [[templateId]]);
        this.notification.add(_t("Box opened."), { type: "success" });
    },
    async onClickFindSubstitutes() {
        const order = this.pos.getOrder();
        const line = order ? order.getSelectedOrderline() : null;
        if (!line || !line.product_id) return;

        const product = line.product_id;
        const templateId = product.product_tmpl_id.id || product.product_tmpl_id;

        const results = await this.orm.call("product.template", "get_substitute_products", [[templateId]]);

        if (results.length === 0) {
            this.notification.add(_t("No substitutes found."), { type: "info" });
            return;
        }

        this.dialog.add(SubstitutionPopup, {
            title: _t("Substitutes for %s", product.display_name),
            substitutes: results,
            onReplace: async (substitute) => {
                const newProduct = this.pos.db.get_product_by_id(substitute.product_id);
                if (newProduct) {
                    const originalLine = order.getSelectedOrderline();
                    const qty = originalLine.get_quantity();

                    // Remove old line and add new one
                    order.removeOrderline(originalLine);
                    await order.add_product(newProduct, { quantity: qty });

                    this.notification.add(_t("Product replaced with %s", newProduct.display_name), { type: "success" });
                }
            },
            onAdd: async (substitute) => {
                const newProduct = this.pos.db.get_product_by_id(substitute.product_id);
                if (newProduct) {
                    await order.add_product(newProduct, { quantity: 1 });
                    this.notification.add(_t("Added %s to order", newProduct.display_name), { type: "success" });
                }
            }
        });
    }
});

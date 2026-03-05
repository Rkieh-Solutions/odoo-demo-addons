/** @odoo-module **/

import { registry } from "@web/core/registry";

/**
 * Client-side handler for substitution replacement.
 * This version attempts to update the UI directly if possible, avoiding reload blocks.
 */
function substituteReplaceHandler(env, action) {
    const params = action.params || {};
    const productId = params.product_id;
    const productName = params.product_name || "Substitute Product";
    const isAuto = params.auto || false;
    const saleLineId = params.sale_line_id;

    // 1. Notify the user
    const message = isAuto
        ? `SMART REPLACEMENT: ${productName} (Ingredients match).`
        : `SUCCESS: Replaced with ${productName}.`;

    env.services.notification.add(message, {
        type: "success",
        sticky: false,
        className: "bg-success text-white"
    });

    /**
     * ADVANCED: Attempt to update the local state of the parent form if it exists.
     * This avoids the "Please save your changes first" error because we stay in the same view
     * and update the dirty record in-place.
     */
    try {
        const actionService = env.services.action;
        // In Odoo 17, we can often find the parent controller in the stack
        const stack = actionService.getStack ? actionService.getStack() : [];
        // The wizard is the top, parent is usually index - 2 if wizard is a dialog
        // But easier is to look at the current active view after wizard closes

        // We wait a bit for the wizard to close properly
        setTimeout(async () => {
            // Refresh logic: try to trigger a soft reload that doesn't block
            // If we are in a FormView, we can update the field directly if we find it
            const activeView = env.services.view && env.services.view.active_view;
            if (activeView && activeView.view && activeView.view.model) {
                const model = activeView.view.model;
                if (model.root && model.root.data) {
                    // This is our best shot at a clean refresh
                    try {
                        await model.root.reload();
                    } catch (e) {
                        // If reload is blocked by dirty state, we at least tried.
                        // The user will see the notification and can save manually.
                        console.warn("Soft reload blocked or failed:", e);
                    }
                }
            } else {
                // Fallback to standard reload if we can't find a sophisticated way
                env.services.action.doAction({ type: "ir.actions.client", tag: "reload" });
            }
        }, 100);

    } catch (error) {
        console.error("Substitution UI Update Error:", error);
    }

    return true;
}

registry.category("actions").add("substitute_replace", substituteReplaceHandler);

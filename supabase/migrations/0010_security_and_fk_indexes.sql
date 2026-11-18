-- ============================================================================
-- MIGRACIÓN 0010: Endurecimiento de Seguridad (Revoke RPCs públicas) e Índices FK
-- ============================================================================

ALTER EXTENSION unaccent SET SCHEMA extensions;

ALTER VIEW public.public_variant_availability SET (security_invoker = true);

CREATE POLICY "inventory_levels_select_active_public" ON public.inventory_levels
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.product_variants pv
      JOIN public.products p ON p.id = pv.product_id
      WHERE pv.id = inventory_levels.variant_id
        AND pv.status = 'active'
        AND p.status = 'active'
    )
    OR public.is_admin()
  );

REVOKE ALL ON FUNCTION public.check_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO service_role;

REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user() TO service_role;

REVOKE ALL ON FUNCTION public.prevent_role_self_escalation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_role_self_escalation() TO service_role;

REVOKE ALL ON FUNCTION public.process_approved_payment_atomic(uuid, text, text, text, bigint, text, text, integer, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_approved_payment_atomic(uuid, text, text, text, bigint, text, text, integer, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.release_expired_reservations(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_expired_reservations(uuid[]) TO service_role;

REVOKE ALL ON FUNCTION public.reserve_stock_for_order_atomic(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_stock_for_order_atomic(uuid, integer) TO service_role;

CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_variant_id ON public.cart_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON public.order_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_orders_parent_order_id ON public.orders(parent_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_refunds_payment_id ON public.payment_refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_refunds_requested_by ON public.payment_refunds(requested_by);
CREATE INDEX IF NOT EXISTS idx_billing_docs_related_id ON public.billing_documents(related_document_id);
CREATE INDEX IF NOT EXISTS idx_billing_docs_uploaded_by ON public.billing_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_return_requests_replacement_order ON public.return_requests(replacement_order_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_inspected_by ON public.return_requests(inspected_by);
CREATE INDEX IF NOT EXISTS idx_return_requests_resolved_by ON public.return_requests(resolved_by);
CREATE INDEX IF NOT EXISTS idx_return_items_order_item_id ON public.return_items(order_item_id);
CREATE INDEX IF NOT EXISTS idx_return_items_variant_id ON public.return_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_return_items_restocked_movement ON public.return_items(restocked_movement_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_variant_id ON public.stock_reservations(variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_warehouse_id ON public.inventory_movements(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_actor_user_id ON public.inventory_movements(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_actor ON public.order_status_history(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_user_id ON public.audit_logs(actor_user_id);

-- ============================================================================
-- MIGRACIÓN 0009: Políticas Row Level Security (RLS) y Buckets de Storage
-- ============================================================================

-- Habilitar RLS en todas las tablas del esquema public
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_carrier_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

-- 1. Perfiles y direcciones
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT USING ((SELECT auth.uid()) = id OR public.is_admin());

CREATE POLICY "profiles_update_own_or_admin" ON public.profiles
  FOR UPDATE USING ((SELECT auth.uid()) = id OR public.is_admin())
  WITH CHECK ((SELECT auth.uid()) = id OR public.is_admin());

CREATE POLICY "addresses_all_own_or_admin" ON public.customer_addresses
  FOR ALL USING ((SELECT auth.uid()) = user_id OR public.is_admin())
  WITH CHECK ((SELECT auth.uid()) = user_id OR public.is_admin());

-- 2. Catálogo: Público solo ve activos; Admin ve y edita todo (incluyendo 'draft')
CREATE POLICY "brands_select_public_or_admin" ON public.brands
  FOR SELECT USING (is_active = true OR public.is_admin());

CREATE POLICY "brands_write_admin" ON public.brands
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "categories_select_public_or_admin" ON public.categories
  FOR SELECT USING (is_active = true OR public.is_admin());

CREATE POLICY "categories_write_admin" ON public.categories
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "products_select_active_or_admin" ON public.products
  FOR SELECT USING (status = 'active' OR public.is_admin());

CREATE POLICY "products_write_admin" ON public.products
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "variants_select_active_or_admin" ON public.product_variants
  FOR SELECT USING (
    (status = 'active' AND EXISTS (
      SELECT 1 FROM public.products p WHERE p.id = product_id AND p.status = 'active'
    ))
    OR public.is_admin()
  );

CREATE POLICY "variants_write_admin" ON public.product_variants
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "product_images_select_active_or_admin" ON public.product_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.products p WHERE p.id = product_id AND p.status = 'active'
    )
    OR public.is_admin()
  );

CREATE POLICY "product_images_write_admin" ON public.product_images
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 3. Inventario (acceso directo exclusivo admin; storefront consulta public_variant_availability)
CREATE POLICY "warehouses_admin_only" ON public.warehouses
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "inventory_levels_admin_only" ON public.inventory_levels
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "inventory_movements_admin_only" ON public.inventory_movements
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "stock_reservations_admin_only" ON public.stock_reservations
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4. Carritos (usuarios autenticados acceden a su carrito; invitados vía servidor service_role)
CREATE POLICY "carts_own_or_admin" ON public.carts
  FOR ALL USING (user_id = (SELECT auth.uid()) OR public.is_admin())
  WITH CHECK (user_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "cart_items_own_or_admin" ON public.cart_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_id AND (c.user_id = (SELECT auth.uid()) OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_id AND (c.user_id = (SELECT auth.uid()) OR public.is_admin())
    )
  );

-- 5. Logística
CREATE POLICY "shipping_carriers_select_enabled_or_admin" ON public.shipping_carrier_configs
  FOR SELECT USING (is_enabled = true OR public.is_admin());

CREATE POLICY "shipping_carriers_write_admin" ON public.shipping_carrier_configs
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "shipping_quotes_own_or_admin" ON public.shipping_quotes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_id AND (c.user_id = (SELECT auth.uid()) OR public.is_admin())
    )
  );

-- 6. Órdenes, Pagos y Envíos
CREATE POLICY "orders_select_own_or_admin" ON public.orders
  FOR SELECT USING (user_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "orders_write_admin" ON public.orders
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "order_items_select_own_or_admin" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND (o.user_id = (SELECT auth.uid()) OR public.is_admin())
    )
  );

CREATE POLICY "order_history_select_own_or_admin" ON public.order_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND (o.user_id = (SELECT auth.uid()) OR public.is_admin())
    )
  );

CREATE POLICY "payments_select_own_or_admin" ON public.payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND (o.user_id = (SELECT auth.uid()) OR public.is_admin())
    )
  );

CREATE POLICY "payments_write_admin" ON public.payments
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "payment_refunds_admin_only" ON public.payment_refunds
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "shipments_select_own_or_admin" ON public.shipments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND (o.user_id = (SELECT auth.uid()) OR public.is_admin())
    )
  );

CREATE POLICY "shipments_write_admin" ON public.shipments
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 7. Facturación (Bucket Privado y tabla exclusiva Admin — Sección 12)
CREATE POLICY "billing_documents_admin_only" ON public.billing_documents
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 8. Devoluciones y Posventa
CREATE POLICY "return_requests_select_own_or_admin" ON public.return_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND (o.user_id = (SELECT auth.uid()) OR public.is_admin())
    )
  );

CREATE POLICY "return_requests_write_admin" ON public.return_requests
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "return_items_select_own_or_admin" ON public.return_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.return_requests rr
      JOIN public.orders o ON o.id = rr.order_id
      WHERE rr.id = return_request_id AND (o.user_id = (SELECT auth.uid()) OR public.is_admin())
    )
  );

CREATE POLICY "return_items_write_admin" ON public.return_items
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 9. Outbox, Webhook Inbox, Auditoría, Configuración y Rate Limit
CREATE POLICY "outbox_admin_only" ON public.outbox_events
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "webhook_inbox_admin_only" ON public.webhook_inbox
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "audit_logs_admin_select_insert" ON public.audit_logs
  FOR SELECT USING (public.is_admin());

CREATE POLICY "audit_logs_admin_insert" ON public.audit_logs
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "store_settings_select_public" ON public.store_settings
  FOR SELECT USING (true);

CREATE POLICY "store_settings_write_admin" ON public.store_settings
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "rate_limit_admin_only" ON public.rate_limit_buckets
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 10. Buckets de Supabase Storage (product-media público, billing-documents privado)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('product-media', 'product-media', true, 10485760, ARRAY['image/webp', 'image/jpeg', 'image/png']),
  ('billing-documents', 'billing-documents', false, 20971520, ARRAY['application/pdf']),
  ('return-evidence', 'return-evidence', false, 10485760, ARRAY['image/webp', 'image/jpeg', 'image/png', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "product_media_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-media');

CREATE POLICY "product_media_admin_write" ON storage.objects
  FOR ALL USING (bucket_id = 'product-media' AND public.is_admin())
  WITH CHECK (bucket_id = 'product-media' AND public.is_admin());

CREATE POLICY "billing_docs_admin_only" ON storage.objects
  FOR ALL USING (bucket_id = 'billing-documents' AND public.is_admin())
  WITH CHECK (bucket_id = 'billing-documents' AND public.is_admin());

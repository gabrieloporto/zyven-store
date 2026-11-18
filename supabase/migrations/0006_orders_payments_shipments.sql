-- ============================================================================
-- MIGRACIÓN 0006: Órdenes, Pagos (Mercado Pago), Envíos y Funciones Transaccionales
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 1001 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT
LANGUAGE sql
VOLATILE
SET search_path = public
AS $$
  SELECT 'ZYV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.order_number_seq')::text, 6, '0');
$$;

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE DEFAULT public.generate_order_number(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  parent_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  buyer_email TEXT NOT NULL,
  buyer_full_name TEXT NOT NULL,
  buyer_phone TEXT NOT NULL,
  buyer_document_type TEXT NOT NULL DEFAULT 'DNI',
  buyer_document_number TEXT NOT NULL,
  shipping_address_snapshot JSONB NOT NULL,
  delivery_modality TEXT NOT NULL,
  shipping_quote_snapshot JSONB NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'ARS' CHECK (currency = 'ARS'),
  subtotal_centavos BIGINT NOT NULL CHECK (subtotal_centavos >= 0),
  discount_centavos BIGINT NOT NULL DEFAULT 0 CHECK (discount_centavos >= 0),
  shipping_centavos BIGINT NOT NULL DEFAULT 0 CHECK (shipping_centavos >= 0),
  total_centavos BIGINT NOT NULL CHECK (
    total_centavos = subtotal_centavos - discount_centavos + shipping_centavos
  ),
  coupon_code_snapshot TEXT,
  -- 5 Ejes de estado separados (Sección 8)
  order_status public.order_status NOT NULL DEFAULT 'pending_payment',
  payment_status public.payment_status NOT NULL DEFAULT 'unpaid',
  fulfillment_status public.fulfillment_status NOT NULL DEFAULT 'unfulfilled',
  shipping_status public.shipping_status NOT NULL DEFAULT 'ready_to_ship',
  billing_status public.billing_status NOT NULL DEFAULT 'pending',
  reservation_expires_at TIMESTAMPTZ,
  manual_review_reason TEXT,
  customer_notes TEXT,
  internal_admin_notes TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_statuses ON public.orders(order_status, payment_status, fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_orders_billing_status ON public.orders(billing_status);

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.stock_reservations
  DROP CONSTRAINT IF EXISTS fk_stock_reservations_order;
ALTER TABLE public.stock_reservations
  ADD CONSTRAINT fk_stock_reservations_order
  FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  product_name_snapshot TEXT NOT NULL,
  variant_title_snapshot TEXT NOT NULL,
  sku_snapshot TEXT NOT NULL,
  option_values_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  attributes_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  image_url_snapshot TEXT,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price_centavos BIGINT NOT NULL CHECK (unit_price_centavos >= 0),
  unit_discount_centavos BIGINT NOT NULL DEFAULT 0 CHECK (unit_discount_centavos >= 0),
  line_total_centavos BIGINT NOT NULL CHECK (
    line_total_centavos = (unit_price_centavos - unit_discount_centavos) * quantity
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  axis TEXT NOT NULL CHECK (axis IN ('order', 'payment', 'fulfillment', 'shipping', 'billing')),
  from_status TEXT,
  to_status TEXT NOT NULL,
  reason TEXT,
  actor_user_id UUID REFERENCES public.profiles(id),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON public.order_status_history(order_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  provider TEXT NOT NULL DEFAULT 'mercadopago',
  mp_preference_id TEXT,
  mp_payment_id TEXT UNIQUE,
  mp_merchant_order_id TEXT,
  external_reference TEXT NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'pending',
  status_detail TEXT,
  payment_method_id TEXT,
  payment_type_id TEXT,
  installments INT,
  amount_centavos BIGINT NOT NULL CHECK (amount_centavos >= 0),
  refunded_amount_centavos BIGINT NOT NULL DEFAULT 0 CHECK (refunded_amount_centavos >= 0),
  net_received_centavos BIGINT,
  is_late_payment BOOLEAN NOT NULL DEFAULT false,
  approved_at TIMESTAMPTZ,
  raw_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);

DROP TRIGGER IF EXISTS trg_payments_updated_at ON public.payments;
CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.payment_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  return_request_id UUID,
  mp_refund_id TEXT UNIQUE,
  amount_centavos BIGINT NOT NULL CHECK (amount_centavos > 0),
  status TEXT NOT NULL CHECK (status IN ('requested', 'pending', 'approved', 'rejected', 'failed')),
  reason TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  requested_by UUID REFERENCES public.profiles(id),
  confirmed_at TIMESTAMPTZ,
  raw_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_refunds_order ON public.payment_refunds(order_id);

CREATE TABLE IF NOT EXISTS public.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  provider_code TEXT NOT NULL,
  service_code TEXT NOT NULL,
  service_name TEXT NOT NULL,
  delivery_modality TEXT NOT NULL,
  status public.shipping_status NOT NULL DEFAULT 'ready_to_ship',
  external_shipment_id TEXT,
  tracking_number TEXT,
  tracking_url TEXT,
  label_storage_path TEXT,
  label_external_url TEXT,
  packages JSONB NOT NULL DEFAULT '[]'::jsonb,
  tracking_events JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_error TEXT,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipments_order_id ON public.shipments(order_id);

DROP TRIGGER IF EXISTS trg_shipments_updated_at ON public.shipments;
CREATE TRIGGER trg_shipments_updated_at
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

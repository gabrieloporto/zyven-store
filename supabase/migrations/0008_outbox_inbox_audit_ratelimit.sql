-- ============================================================================
-- MIGRACIÓN 0008: Outbox, Webhook Inbox, Auditoría Append-Only, Rate Limit y RPCs Atómicas
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type TEXT NOT NULL,
  aggregate_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'processed', 'failed_permanent')
  ),
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 6,
  next_retry_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outbox_pending
  ON public.outbox_events(status, next_retry_at)
  WHERE status IN ('pending', 'processing');

CREATE TABLE IF NOT EXISTS public.webhook_inbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  dedup_key TEXT NOT NULL UNIQUE,
  topic TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  signature_valid BOOLEAN NOT NULL DEFAULT false,
  headers JSONB NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'received' CHECK (
    status IN ('received', 'processing', 'processed', 'ignored', 'failed')
  ),
  attempts INT NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_inbox_status
  ON public.webhook_inbox(status, next_retry_at)
  WHERE status IN ('received', 'failed');

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES public.profiles(id),
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  before_state JSONB,
  after_state JSONB,
  metadata JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id, created_at DESC);

-- Hacer audit_logs estrictamente append-only (Sección 13)
CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'La tabla audit_logs es estrictamente append-only. No se permiten modificaciones ni borrados.';
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();

-- Configuración general de la tienda (Sección 11)
CREATE TABLE IF NOT EXISTS public.store_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  store_name TEXT NOT NULL DEFAULT 'Zyven Store',
  legal_name TEXT,
  cuit TEXT,
  tax_condition TEXT DEFAULT 'Pendiente definir con contador',
  support_email TEXT NOT NULL DEFAULT 'contacto@zyvenstore.com.ar',
  support_phone TEXT,
  origin_locality TEXT NOT NULL DEFAULT 'Alejandro Korn',
  origin_party TEXT NOT NULL DEFAULT 'San Vicente',
  origin_province TEXT NOT NULL DEFAULT 'Buenos Aires',
  origin_postal_code TEXT NOT NULL DEFAULT '1864',
  reservation_ttl_minutes INT NOT NULL DEFAULT 30 CHECK (reservation_ttl_minutes BETWEEN 5 AND 1440),
  mercadopago_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.store_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Rate limiting en PostgreSQL sin costo adicional ($0, sin Redis/Upstash)
CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  key TEXT PRIMARY KEY,
  hit_count INT NOT NULL DEFAULT 1,
  window_expires_at TIMESTAMPTZ NOT NULL
);

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key TEXT,
  p_limit INT,
  p_window_seconds INT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  INSERT INTO public.rate_limit_buckets (key, hit_count, window_expires_at)
  VALUES (p_key, 1, now() + make_interval(secs => p_window_seconds))
  ON CONFLICT (key) DO UPDATE
    SET hit_count = CASE
          WHEN public.rate_limit_buckets.window_expires_at <= now() THEN 1
          ELSE public.rate_limit_buckets.hit_count + 1
        END,
        window_expires_at = CASE
          WHEN public.rate_limit_buckets.window_expires_at <= now()
            THEN now() + make_interval(secs => p_window_seconds)
          ELSE public.rate_limit_buckets.window_expires_at
        END
  RETURNING hit_count INTO v_count;

  RETURN v_count <= p_limit;
END;
$$;

-- ============================================================================
-- FUNCIONES TRANSACCIONALES CRÍTICAS DE INVENTARIO Y PAGOS (Secciones 7, 8 y 9)
-- ============================================================================

-- 1. Liberar reservas vencidas (en línea por variante o globalmente desde el Cron)
CREATE OR REPLACE FUNCTION public.release_expired_reservations(
  p_variant_ids UUID[] DEFAULT NULL
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_inv public.inventory_levels%ROWTYPE;
  v_count INT := 0;
BEGIN
  FOR r IN
    SELECT sr.id, sr.order_id, sr.variant_id, sr.quantity
    FROM public.stock_reservations sr
    WHERE sr.status = 'active'
      AND sr.expires_at <= now()
      AND (p_variant_ids IS NULL OR sr.variant_id = ANY(p_variant_ids))
    ORDER BY sr.variant_id, sr.id
    FOR UPDATE SKIP LOCKED
  LOOP
    SELECT * INTO v_inv
    FROM public.inventory_levels
    WHERE variant_id = r.variant_id
    FOR UPDATE;

    UPDATE public.inventory_levels
    SET reserved = GREATEST(reserved - r.quantity, 0),
        updated_at = now()
    WHERE variant_id = r.variant_id;

    UPDATE public.stock_reservations
    SET status = 'expired',
        released_at = now()
    WHERE id = r.id;

    INSERT INTO public.inventory_movements (
      variant_id, warehouse_id, movement_type, quantity_delta,
      on_hand_before, on_hand_after, reserved_before, reserved_after,
      reference_type, reference_id, idempotency_key, reason
    ) VALUES (
      r.variant_id, v_inv.warehouse_id, 'reservation_release', -r.quantity,
      v_inv.on_hand, v_inv.on_hand, v_inv.reserved, GREATEST(v_inv.reserved - r.quantity, 0),
      'order', r.order_id, 'expire-res:' || r.id::text, 'Liberación automática de reserva vencida'
    ) ON CONFLICT (idempotency_key) DO NOTHING;

    -- Si la orden sigue en pending_payment y sin pago aprobado, registrar expiración
    UPDATE public.orders
    SET order_status = 'cancelled',
        updated_at = now()
    WHERE id = r.order_id
      AND order_status = 'pending_payment'
      AND payment_status IN ('unpaid', 'rejected', 'cancelled');

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- 2. Reservar stock de manera atómica para una orden recién creada
CREATE OR REPLACE FUNCTION public.reserve_stock_for_order_atomic(
  p_order_id UUID,
  p_ttl_minutes INT DEFAULT 30
) RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_variant_ids UUID[];
  item RECORD;
  v_inv public.inventory_levels%ROWTYPE;
  v_expires_at TIMESTAMPTZ := now() + make_interval(mins => p_ttl_minutes);
BEGIN
  -- Obtener todos los variant_id de la orden en orden determinístico
  SELECT array_agg(variant_id ORDER BY variant_id)
  INTO v_variant_ids
  FROM public.order_items
  WHERE order_id = p_order_id AND variant_id IS NOT NULL;

  IF v_variant_ids IS NULL OR array_length(v_variant_ids, 1) = 0 THEN
    RAISE EXCEPTION 'La orden % no contiene variantes válidas para reservar.', p_order_id;
  END IF;

  -- Primero liberar reservas vencidas de esas variantes en línea (sin depender de puntualidad del Cron)
  PERFORM public.release_expired_reservations(v_variant_ids);

  -- Bloquear filas de inventario en orden de variant_id para evitar deadlocks
  FOR item IN
    SELECT oi.variant_id, SUM(oi.quantity)::INT AS total_qty, MAX(oi.sku_snapshot) AS sku
    FROM public.order_items oi
    WHERE oi.order_id = p_order_id
    GROUP BY oi.variant_id
    ORDER BY oi.variant_id
  LOOP
    SELECT * INTO v_inv
    FROM public.inventory_levels
    WHERE variant_id = item.variant_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK: No existe registro de inventario para SKU %', item.sku;
    END IF;

    IF (v_inv.on_hand - v_inv.reserved) < item.total_qty THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK: Stock insuficiente para SKU % (disponible: %, solicitado: %)',
        item.sku, (v_inv.on_hand - v_inv.reserved), item.total_qty;
    END IF;

    UPDATE public.inventory_levels
    SET reserved = reserved + item.total_qty,
        updated_at = now()
    WHERE variant_id = item.variant_id;

    INSERT INTO public.stock_reservations (
      order_id, variant_id, quantity, status, expires_at
    ) VALUES (
      p_order_id, item.variant_id, item.total_qty, 'active', v_expires_at
    ) ON CONFLICT (order_id, variant_id) DO NOTHING;

    INSERT INTO public.inventory_movements (
      variant_id, warehouse_id, movement_type, quantity_delta,
      on_hand_before, on_hand_after, reserved_before, reserved_after,
      reference_type, reference_id, idempotency_key, reason
    ) VALUES (
      item.variant_id, v_inv.warehouse_id, 'reservation_hold', item.total_qty,
      v_inv.on_hand, v_inv.on_hand, v_inv.reserved, v_inv.reserved + item.total_qty,
      'order', p_order_id, 'hold:' || p_order_id::text || ':' || item.variant_id::text,
      'Reserva temporal en checkout'
    ) ON CONFLICT (idempotency_key) DO NOTHING;
  END LOOP;

  UPDATE public.orders
  SET reservation_expires_at = v_expires_at,
      updated_at = now()
  WHERE id = p_order_id;

  RETURN v_expires_at;
END;
$$;

-- 3. Procesar pago aprobado (maneja tanto pago en término como PAGO TARDÍO con revisión manual)
CREATE OR REPLACE FUNCTION public.process_approved_payment_atomic(
  p_order_id UUID,
  p_mp_payment_id TEXT,
  p_mp_preference_id TEXT,
  p_mp_merchant_order_id TEXT,
  p_amount_centavos BIGINT,
  p_payment_method_id TEXT,
  p_payment_type_id TEXT,
  p_installments INT,
  p_raw_response JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_has_expired_or_released BOOLEAN := false;
  v_active_count INT := 0;
  res RECORD;
  v_inv public.inventory_levels%ROWTYPE;
BEGIN
  -- Bloquear la orden
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Orden % no encontrada al procesar pago %', p_order_id, p_mp_payment_id;
  END IF;

  -- Idempotencia: si este mp_payment_id ya fue aprobado, retornar sin duplicar
  IF EXISTS (
    SELECT 1 FROM public.payments
    WHERE mp_payment_id = p_mp_payment_id AND status = 'approved'
  ) THEN
    RETURN jsonb_build_object(
      'outcome', 'already_processed',
      'order_status', v_order.order_status,
      'payment_status', v_order.payment_status
    );
  END IF;

  -- Verificar estado de las reservas de la orden (bloqueándolas)
  FOR res IN
    SELECT * FROM public.stock_reservations
    WHERE order_id = p_order_id
    ORDER BY variant_id
    FOR UPDATE
  LOOP
    IF res.status IN ('expired', 'released') THEN
      v_has_expired_or_released := true;
    ELSIF res.status = 'active' THEN
      v_active_count := v_active_count + 1;
    END IF;
  END LOOP;

  -- Verificar también si el monto pagado difiere del total de la orden
  IF p_amount_centavos < v_order.total_centavos THEN
    v_has_expired_or_released := true;
  END IF;

  -- ESCENARIO PAGO TARDÍO (Sección 7): La reserva ya había vencido y liberado el stock
  IF v_has_expired_or_released OR v_active_count = 0 THEN
    INSERT INTO public.payments (
      order_id, provider, mp_preference_id, mp_payment_id, mp_merchant_order_id,
      external_reference, status, status_detail, payment_method_id, payment_type_id,
      installments, amount_centavos, is_late_payment, approved_at, raw_response
    ) VALUES (
      p_order_id, 'mercadopago', p_mp_preference_id, p_mp_payment_id, p_mp_merchant_order_id,
      p_order_id::text, 'approved', 'accredited_late_reservation_expired',
      p_payment_method_id, p_payment_type_id, p_installments, p_amount_centavos,
      true, now(), p_raw_response
    )
    ON CONFLICT (mp_payment_id) DO UPDATE
      SET status = 'approved',
          is_late_payment = true,
          approved_at = now(),
          raw_response = EXCLUDED.raw_response;

    -- La orden pasa a revisión manual sin tocar el stock que pudo haberse vendido ni habilitar despacho
    UPDATE public.orders
    SET order_status = 'manual_review',
        payment_status = 'approved',
        fulfillment_status = 'on_hold',
        shipping_status = 'not_required',
        manual_review_reason = 'Pago aprobado recibido después del vencimiento y liberación de la reserva de stock.',
        updated_at = now()
    WHERE id = p_order_id;

    INSERT INTO public.order_status_history (order_id, axis, from_status, to_status, reason, metadata)
    VALUES (
      p_order_id, 'order', v_order.order_status::text, 'manual_review',
      'Pago tardío detectado tras expiración de reserva. Requiere revisión manual.',
      jsonb_build_object('mp_payment_id', p_mp_payment_id, 'amount_centavos', p_amount_centavos)
    );

    INSERT INTO public.outbox_events (
      aggregate_type, aggregate_id, event_type, payload, idempotency_key
    ) VALUES (
      'order', p_order_id, 'order.late_payment_manual_review_required',
      jsonb_build_object('order_id', p_order_id, 'order_number', v_order.order_number, 'mp_payment_id', p_mp_payment_id),
      'late-payment:' || p_mp_payment_id
    ) ON CONFLICT (idempotency_key) DO NOTHING;

    RETURN jsonb_build_object(
      'outcome', 'manual_review_late_payment',
      'order_status', 'manual_review',
      'payment_status', 'approved'
    );
  END IF;

  -- ESCENARIO NORMAL: Reservas activas -> comprometer stock (descontar de on_hand y reserved)
  FOR res IN
    SELECT * FROM public.stock_reservations
    WHERE order_id = p_order_id AND status = 'active'
    ORDER BY variant_id
  LOOP
    SELECT * INTO v_inv
    FROM public.inventory_levels
    WHERE variant_id = res.variant_id
    FOR UPDATE;

    UPDATE public.inventory_levels
    SET on_hand = on_hand - res.quantity,
        reserved = reserved - res.quantity,
        updated_at = now()
    WHERE variant_id = res.variant_id;

    UPDATE public.stock_reservations
    SET status = 'committed',
        committed_at = now()
    WHERE id = res.id;

    INSERT INTO public.inventory_movements (
      variant_id, warehouse_id, movement_type, quantity_delta,
      on_hand_before, on_hand_after, reserved_before, reserved_after,
      reference_type, reference_id, idempotency_key, reason
    ) VALUES (
      res.variant_id, v_inv.warehouse_id, 'sale_commit', -res.quantity,
      v_inv.on_hand, v_inv.on_hand - res.quantity, v_inv.reserved, v_inv.reserved - res.quantity,
      'order', p_order_id, 'commit:' || p_order_id::text || ':' || res.variant_id::text,
      'Confirmación de venta por pago aprobado #' || p_mp_payment_id
    ) ON CONFLICT (idempotency_key) DO NOTHING;
  END LOOP;

  INSERT INTO public.payments (
    order_id, provider, mp_preference_id, mp_payment_id, mp_merchant_order_id,
    external_reference, status, status_detail, payment_method_id, payment_type_id,
    installments, amount_centavos, is_late_payment, approved_at, raw_response
  ) VALUES (
    p_order_id, 'mercadopago', p_mp_preference_id, p_mp_payment_id, p_mp_merchant_order_id,
    p_order_id::text, 'approved', 'accredited',
    p_payment_method_id, p_payment_type_id, p_installments, p_amount_centavos,
    false, now(), p_raw_response
  )
  ON CONFLICT (mp_payment_id) DO UPDATE
    SET status = 'approved',
        approved_at = now(),
        raw_response = EXCLUDED.raw_response;

  UPDATE public.orders
  SET order_status = 'confirmed',
      payment_status = 'approved',
      fulfillment_status = 'ready_to_pick',
      shipping_status = 'ready_to_ship',
      updated_at = now()
  WHERE id = p_order_id;

  INSERT INTO public.order_status_history (order_id, axis, from_status, to_status, reason, metadata)
  VALUES (
    p_order_id, 'order', v_order.order_status::text, 'confirmed',
    'Pago aprobado en término y stock comprometido.',
    jsonb_build_object('mp_payment_id', p_mp_payment_id)
  );

  INSERT INTO public.outbox_events (
    aggregate_type, aggregate_id, event_type, payload, idempotency_key
  ) VALUES (
    'order', p_order_id, 'payment.approved',
    jsonb_build_object('order_id', p_order_id, 'order_number', v_order.order_number, 'mp_payment_id', p_mp_payment_id),
    'payment-approved:' || p_mp_payment_id
  ) ON CONFLICT (idempotency_key) DO NOTHING;

  RETURN jsonb_build_object(
    'outcome', 'confirmed',
    'order_status', 'confirmed',
    'payment_status', 'approved'
  );
END;
$$;

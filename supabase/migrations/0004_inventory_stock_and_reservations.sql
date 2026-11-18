-- ============================================================================
-- MIGRACIÓN 0004: Inventario Propio, Movimientos y Reservas Atómicas
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE DEFAULT 'ALEJANDRO_KORN',
  name TEXT NOT NULL DEFAULT 'Depósito Principal Alejandro Korn',
  locality TEXT NOT NULL DEFAULT 'Alejandro Korn',
  party_department TEXT NOT NULL DEFAULT 'San Vicente',
  province TEXT NOT NULL DEFAULT 'Buenos Aires',
  postal_code TEXT NOT NULL DEFAULT '1864',
  country TEXT NOT NULL DEFAULT 'AR',
  is_default BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insertar depósito único inicial en Alejandro Korn (CP 1864)
INSERT INTO public.warehouses (code, name, locality, party_department, province, postal_code, country, is_default)
VALUES ('ALEJANDRO_KORN', 'Depósito Principal Alejandro Korn', 'Alejandro Korn', 'San Vicente', 'Buenos Aires', '1864', 'AR', true)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.inventory_levels (
  variant_id UUID PRIMARY KEY REFERENCES public.product_variants(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  on_hand INT NOT NULL DEFAULT 0 CHECK (on_hand >= 0),
  reserved INT NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  available INT GENERATED ALWAYS AS (on_hand - reserved) STORED,
  low_stock_threshold INT NOT NULL DEFAULT 2 CHECK (low_stock_threshold >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_no_oversell CHECK (on_hand >= reserved)
);

CREATE INDEX IF NOT EXISTS idx_inventory_levels_warehouse ON public.inventory_levels(warehouse_id);

DROP TRIGGER IF EXISTS trg_inventory_levels_updated_at ON public.inventory_levels;
CREATE TRIGGER trg_inventory_levels_updated_at
  BEFORE UPDATE ON public.inventory_levels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  movement_type public.inventory_movement_type NOT NULL,
  quantity_delta INT NOT NULL CHECK (quantity_delta <> 0),
  on_hand_before INT NOT NULL,
  on_hand_after INT NOT NULL,
  reserved_before INT NOT NULL,
  reserved_after INT NOT NULL,
  reference_type TEXT NOT NULL,
  reference_id UUID,
  idempotency_key TEXT NOT NULL UNIQUE,
  reason TEXT,
  actor_user_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_variant ON public.inventory_movements(variant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.stock_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  quantity INT NOT NULL CHECK (quantity > 0),
  status public.reservation_status NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ NOT NULL,
  committed_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (order_id, variant_id)
);

CREATE INDEX IF NOT EXISTS idx_reservations_active_expires
  ON public.stock_reservations(status, expires_at)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_reservations_order_id ON public.stock_reservations(order_id);

-- Vista pública segura de disponibilidad por variante (sin exponer datos sensibles del depósito)
CREATE OR REPLACE VIEW public.public_variant_availability
WITH (security_invoker = false)
AS
SELECT
  il.variant_id,
  GREATEST(il.on_hand - il.reserved, 0) AS available_qty,
  (il.on_hand - il.reserved) > 0 AS in_stock,
  (il.on_hand - il.reserved) > 0 AND (il.on_hand - il.reserved) <= il.low_stock_threshold AS is_low_stock
FROM public.inventory_levels il
JOIN public.product_variants pv ON pv.id = il.variant_id
JOIN public.products p ON p.id = pv.product_id
WHERE p.status = 'active' AND pv.status = 'active';

GRANT SELECT ON public.public_variant_availability TO anon, authenticated;

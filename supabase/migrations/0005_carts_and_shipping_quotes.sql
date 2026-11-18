-- ============================================================================
-- MIGRACIÓN 0005: Carrito Persistente y Cotizaciones Logísticas Desacopladas
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  guest_token_hash TEXT UNIQUE,
  coupon_code TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_carts_user_id ON public.carts(user_id);

DROP TRIGGER IF EXISTS trg_carts_updated_at ON public.carts;
CREATE TRIGGER trg_carts_updated_at
  BEFORE UPDATE ON public.carts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  quantity INT NOT NULL CHECK (quantity > 0 AND quantity <= 50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cart_id, variant_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON public.cart_items(cart_id);

DROP TRIGGER IF EXISTS trg_cart_items_updated_at ON public.cart_items;
CREATE TRIGGER trg_cart_items_updated_at
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Configuración de operadores logísticos y modos manuales (Sección 10)
CREATE TABLE IF NOT EXISTS public.shipping_carrier_configs (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  is_manual_mode BOOLEAN NOT NULL DEFAULT false,
  requires_manual_quote BOOLEAN NOT NULL DEFAULT false,
  allows_flammable_liquids_ground BOOLEAN NOT NULL DEFAULT false,
  allows_lithium_batteries BOOLEAN NOT NULL DEFAULT false,
  volumetric_divisor INT NOT NULL DEFAULT 5000 CHECK (volumetric_divisor > 0),
  max_package_weight_grams INT NOT NULL DEFAULT 25000 CHECK (max_package_weight_grams > 0),
  pickup_instructions TEXT,
  conditions_text TEXT,
  fixed_cost_centavos BIGINT CHECK (fixed_cost_centavos IS NULL OR fixed_cost_centavos >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Modos manuales deshabilitados inicialmente (Sección 10)
INSERT INTO public.shipping_carrier_configs (
  code, name, is_enabled, is_manual_mode, requires_manual_quote,
  allows_flammable_liquids_ground, allows_lithium_batteries
) VALUES
  ('personal_pickup', 'Retiro Personal en Alejandro Korn', false, true, false, true, true),
  ('manual_coordination', 'Despacho Coordinado Manualmente', false, true, true, true, true),
  ('simulated_dev', 'Simulador Logístico (Solo Desarrollo/Testing)', false, false, false, true, true)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.shipping_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  provider_code TEXT NOT NULL,
  service_code TEXT NOT NULL,
  service_name TEXT NOT NULL,
  delivery_modality TEXT NOT NULL CHECK (
    delivery_modality IN ('home_delivery', 'branch_pickup', 'personal_pickup', 'manual_coordination')
  ),
  price_centavos BIGINT NOT NULL CHECK (price_centavos >= 0),
  requires_manual_quote BOOLEAN NOT NULL DEFAULT false,
  destination_postal_code TEXT NOT NULL,
  destination_province TEXT NOT NULL,
  destination_locality TEXT NOT NULL,
  pickup_branch_id TEXT,
  pickup_branch_name TEXT,
  pickup_branch_address TEXT,
  cart_and_address_fingerprint TEXT NOT NULL,
  packages_snapshot JSONB NOT NULL,
  external_quote_id TEXT,
  estimated_delivery_min_days INT,
  estimated_delivery_max_days INT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipping_quotes_cart_id ON public.shipping_quotes(cart_id);

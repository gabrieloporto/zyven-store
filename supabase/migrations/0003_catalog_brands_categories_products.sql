-- ============================================================================
-- MIGRACIÓN 0003: Catálogo Flexible (Marcas, Categorías, Productos, Variantes e Imágenes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_path TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_brands_updated_at ON public.brands;
CREATE TRIGGER trg_brands_updated_at
  BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES public.categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  seo_title TEXT,
  seo_description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  suggested_attribute_keys JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_parent ON public.categories(parent_id);

DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT,
  description TEXT,
  status public.publication_status NOT NULL DEFAULT 'draft',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  has_variants BOOLEAN NOT NULL DEFAULT false,
  option_names JSONB NOT NULL DEFAULT '[]'::jsonb,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Restricciones logísticas y de transporte (Sección 10)
  contains_flammable_liquid BOOLEAN NOT NULL DEFAULT false,
  contains_lithium_battery BOOLEAN NOT NULL DEFAULT false,
  lithium_battery_type TEXT NOT NULL DEFAULT 'none' CHECK (
    lithium_battery_type IN ('none', 'contained_in_equipment', 'standalone_powerbank')
  ),
  requires_special_packaging BOOLEAN NOT NULL DEFAULT false,
  -- Calidad del catálogo (Sección 26.D: impide publicar sin confirmar nombre comercial)
  commercial_name_confirmed BOOLEAN NOT NULL DEFAULT true,
  quality_review_notes TEXT,
  seo_title TEXT,
  seo_description TEXT,
  search_vector TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('spanish', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(short_description, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(description, '')), 'C')
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Regla de negocio: un producto cuyo nombre comercial no está confirmado no puede pasar a 'active'
  CONSTRAINT chk_confirmed_name_before_publish CHECK (
    status <> 'active' OR commercial_name_confirmed = true
  )
);

CREATE INDEX IF NOT EXISTS idx_products_status_category ON public.products(status, category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(is_featured) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_products_search_vector ON public.products USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_products_attributes_gin ON public.products USING GIN(attributes jsonb_path_ops);

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT 'Estándar',
  is_default BOOLEAN NOT NULL DEFAULT false,
  status public.publication_status NOT NULL DEFAULT 'draft',
  price_centavos BIGINT NOT NULL CHECK (price_centavos > 0),
  promotional_price_centavos BIGINT CHECK (
    promotional_price_centavos IS NULL OR
    (promotional_price_centavos > 0 AND promotional_price_centavos < price_centavos)
  ),
  promo_starts_at TIMESTAMPTZ,
  promo_ends_at TIMESTAMPTZ,
  option_values JSONB NOT NULL DEFAULT '{}'::jsonb,
  weight_grams INT NOT NULL DEFAULT 250 CHECK (weight_grams > 0),
  height_cm NUMERIC(6,2) NOT NULL DEFAULT 10 CHECK (height_cm > 0),
  width_cm NUMERIC(6,2) NOT NULL DEFAULT 10 CHECK (width_cm > 0),
  depth_cm NUMERIC(6,2) NOT NULL DEFAULT 10 CHECK (depth_cm > 0),
  barcode TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_variants_product_status ON public.product_variants(product_id, status);
CREATE INDEX IF NOT EXISTS idx_variants_option_values_gin ON public.product_variants USING GIN(option_values jsonb_path_ops);

DROP TRIGGER IF EXISTS trg_product_variants_updated_at ON public.product_variants;
CREATE TRIGGER trg_product_variants_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  alt_text TEXT NOT NULL,
  width INT,
  height INT,
  sort_order INT NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON public.product_images(product_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_product_images_variant ON public.product_images(variant_id);

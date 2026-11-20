import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/admin';
import { resolveEffectivePriceCentavos } from '@/lib/money';

export interface CatalogProductSummary {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  isFeatured: boolean;
  hasVariants: boolean;
  categoryName: string;
  categorySlug: string;
  brandName: string | null;
  brandSlug: string | null;
  primaryImageUrl: string | null;
  primaryImageAlt: string;
  defaultVariantId: string;
  defaultVariantSku: string;
  effectivePriceCentavos: number;
  compareAtPriceCentavos: number | null;
  discountPercentage: number | null;
  inStock: boolean;
  availableQty: number;
}

export interface CatalogFiltersInput {
  q?: string;
  categorySlug?: string;
  brandSlug?: string;
  minPricePesos?: number;
  maxPricePesos?: number;
  inStockOnly?: boolean;
  sortBy?: 'featured' | 'price_asc' | 'price_desc' | 'newest';
  page?: number;
  pageSize?: number;
}

export async function getActiveCatalogProducts(
  filters: CatalogFiltersInput = {}
): Promise<{
  items: CatalogProductSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
}> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(48, Math.max(1, filters.pageSize ?? 12));

  if (!isSupabaseConfigured()) {
    return { items: [], totalCount: 0, page, pageSize };
  }

  const supabase = await createSupabaseServerClient();

  const brandsJoin = filters.brandSlug ? 'brands!inner(name, slug)' : 'brands(name, slug)';

  let query = supabase
    .from('products')
    .select(
      `
      id,
      name,
      slug,
      short_description,
      is_featured,
      has_variants,
      created_at,
      categories!inner(name, slug),
      ${brandsJoin},
      product_variants!inner(
        id,
        sku,
        is_default,
        status,
        price_centavos,
        promotional_price_centavos,
        promo_starts_at,
        promo_ends_at,
        inventory_levels(on_hand, reserved, available)
      ),
      product_images(public_url, alt_text, is_primary, sort_order)
    `,
      { count: 'exact' }
    )
    .eq('status', 'active')
    .eq('product_variants.status', 'active');

  if (filters.q && filters.q.trim().length > 0) {
    query = query.textSearch('search_vector', filters.q.trim(), {
      config: 'spanish',
      type: 'websearch',
    });
  }

  if (filters.categorySlug) {
    query = query.eq('categories.slug', filters.categorySlug);
  }

  if (filters.brandSlug) {
    query = query.eq('brands.slug', filters.brandSlug);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await query
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error || !data) {
    return { items: [], totalCount: 0, page, pageSize };
  }

  const mapped: CatalogProductSummary[] = [];

  for (const row of data) {
    const variants = Array.isArray(row.product_variants)
      ? row.product_variants
      : [];
    if (variants.length === 0) continue;

    const chosenVariant =
      variants.find((v) => v.is_default) ?? variants[0];
    if (!chosenVariant) continue;

    const totalAvailable = variants.reduce((acc, v) => {
      const inv = Array.isArray(v.inventory_levels)
        ? v.inventory_levels[0]
        : v.inventory_levels;
      return acc + Math.max(0, inv?.available ?? 0);
    }, 0);

    const priceInfo = resolveEffectivePriceCentavos({
      priceCentavos: chosenVariant.price_centavos,
      promotionalPriceCentavos: chosenVariant.promotional_price_centavos,
      promoStartsAt: chosenVariant.promo_starts_at,
      promoEndsAt: chosenVariant.promo_ends_at,
    });

    if (
      filters.minPricePesos != null &&
      priceInfo.effectivePriceCentavos < filters.minPricePesos * 100
    ) {
      continue;
    }

    if (
      filters.maxPricePesos != null &&
      priceInfo.effectivePriceCentavos > filters.maxPricePesos * 100
    ) {
      continue;
    }

    if (filters.inStockOnly && totalAvailable <= 0) {
      continue;
    }

    const images = Array.isArray(row.product_images) ? row.product_images : [];
    const primaryImg =
      images.find((i) => i.is_primary) ?? images[0] ?? null;

    const cat = Array.isArray(row.categories)
      ? row.categories[0]
      : row.categories;
    const brand = Array.isArray(row.brands) ? row.brands[0] : row.brands;

    mapped.push({
      id: row.id,
      name: row.name,
      slug: row.slug,
      shortDescription: row.short_description,
      isFeatured: row.is_featured,
      hasVariants: row.has_variants,
      categoryName: cat?.name ?? 'General',
      categorySlug: cat?.slug ?? 'general',
      brandName: brand?.name ?? null,
      brandSlug: brand?.slug ?? null,
      primaryImageUrl: primaryImg?.public_url ?? null,
      primaryImageAlt: primaryImg?.alt_text ?? row.name,
      defaultVariantId: chosenVariant.id,
      defaultVariantSku: chosenVariant.sku,
      effectivePriceCentavos: priceInfo.effectivePriceCentavos,
      compareAtPriceCentavos: priceInfo.compareAtPriceCentavos,
      discountPercentage: priceInfo.discountPercentage,
      inStock: totalAvailable > 0,
      availableQty: totalAvailable,
    });
  }

  if (filters.sortBy === 'price_asc') {
    mapped.sort((a, b) => a.effectivePriceCentavos - b.effectivePriceCentavos);
  } else if (filters.sortBy === 'price_desc') {
    mapped.sort((a, b) => b.effectivePriceCentavos - a.effectivePriceCentavos);
  }

  return {
    items: mapped,
    totalCount: count ?? mapped.length,
    page,
    pageSize,
  };
}

export async function getActiveProductDetailBySlug(slug: string) {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data: product, error } = await supabase
    .from('products')
    .select(
      `
      *,
      categories(id, name, slug),
      brands(id, name, slug),
      product_variants(
        id,
        sku,
        title,
        is_default,
        status,
        price_centavos,
        promotional_price_centavos,
        promo_starts_at,
        promo_ends_at,
        option_values,
        weight_grams,
        height_cm,
        width_cm,
        depth_cm,
        inventory_levels(on_hand, reserved, available, low_stock_threshold)
      ),
      product_images(id, variant_id, public_url, alt_text, is_primary, sort_order)
    `
    )
    .eq('slug', slug)
    .eq('status', 'active')
    .single();

  if (error || !product) {
    return null;
  }

  return product;
}

export async function getActiveCategoriesList() {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('categories')
    .select('id, name, slug, description, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  return data ?? [];
}

export async function getActiveBrandsList() {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('brands')
    .select('id, name, slug')
    .eq('is_active', true)
    .order('name', { ascending: true });
  return data ?? [];
}

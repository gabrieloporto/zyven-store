import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  EditProductClient,
  type EditableProductData,
  type EditableVariantData,
  type EditableImageData,
  type StockMovementSummary,
} from '@/components/admin/EditProductClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminEditProductPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  const [
    { data: product, error: prodErr },
    { data: categories },
    { data: brands },
  ] = await Promise.all([
    supabase
      .from('products')
      .select(
        `
        id,
        name,
        slug,
        category_id,
        brand_id,
        short_description,
        description,
        status,
        is_featured,
        contains_flammable_liquid,
        contains_lithium_battery,
        lithium_battery_type,
        product_variants(
          id,
          sku,
          title,
          status,
          is_default,
          price_centavos,
          promotional_price_centavos,
          option_values,
          weight_grams,
          sort_order,
          inventory_levels(on_hand, reserved, available, low_stock_threshold)
        ),
        product_images(
          id,
          variant_id,
          public_url,
          storage_path,
          alt_text,
          sort_order,
          is_primary
        )
      `
      )
      .eq('id', id)
      .single(),
    supabase
      .from('categories')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('brands')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('name', { ascending: true }),
  ]);

  if (prodErr || !product) {
    notFound();
  }

  const rawVariants = Array.isArray(product.product_variants)
    ? product.product_variants
    : [];
  const variantIds = rawVariants.map((v) => v.id);

  // Consultar qué variantes tienen ventas en order_items e historial reciente de movimientos
  const [salesRes, movementsRes] = await Promise.all([
    variantIds.length > 0
      ? admin
          .from('order_items')
          .select('variant_id')
          .in('variant_id', variantIds)
      : Promise.resolve({ data: [] as Array<{ variant_id: string }> }),
    variantIds.length > 0
      ? admin
          .from('inventory_movements')
          .select(
            'id, variant_id, movement_type, quantity_delta, on_hand_before, on_hand_after, reason, created_at'
          )
          .in('variant_id', variantIds)
          .order('created_at', { ascending: false })
          .limit(12)
      : Promise.resolve({
          data: [] as Array<{
            id: string;
            variant_id: string;
            movement_type: string;
            quantity_delta: number;
            on_hand_before: number;
            on_hand_after: number;
            reason: string | null;
            created_at: string;
          }>,
        }),
  ]);

  const variantsWithSales = new Set(
    (salesRes.data ?? []).map((row) => row.variant_id)
  );

  const variants: EditableVariantData[] = [...rawVariants]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((v) => {
      const inv = Array.isArray(v.inventory_levels)
        ? v.inventory_levels[0]
        : v.inventory_levels;
      const optionValues: Record<string, string> = {};
      if (
        v.option_values &&
        typeof v.option_values === 'object' &&
        !Array.isArray(v.option_values)
      ) {
        for (const [k, val] of Object.entries(v.option_values)) {
          if (typeof val === 'string') {
            optionValues[k] = val;
          }
        }
      }

      return {
        id: v.id,
        sku: v.sku,
        title: v.title,
        status: v.status,
        isDefault: v.is_default,
        priceCentavos: v.price_centavos,
        promotionalPriceCentavos: v.promotional_price_centavos,
        optionValues,
        weightGrams: v.weight_grams,
        onHand: inv?.on_hand ?? 0,
        reserved: inv?.reserved ?? 0,
        available: inv?.available ?? 0,
        lowStockThreshold: inv?.low_stock_threshold ?? 2,
        hasSales: variantsWithSales.has(v.id),
      };
    });

  const rawImages = Array.isArray(product.product_images)
    ? product.product_images
    : [];
  const images: EditableImageData[] = [...rawImages]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((img) => ({
      id: img.id,
      variantId: img.variant_id,
      publicUrl: img.public_url,
      altText: img.alt_text,
      sortOrder: img.sort_order,
      isPrimary: img.is_primary,
    }));

  const variantSkuMap = new Map(variants.map((v) => [v.id, v.sku]));
  const recentMovements: StockMovementSummary[] = (movementsRes.data ?? []).map(
    (m) => ({
      id: m.id,
      variantId: m.variant_id,
      sku: variantSkuMap.get(m.variant_id) ?? '—',
      movementType: m.movement_type,
      quantityDelta: m.quantity_delta,
      onHandBefore: m.on_hand_before,
      onHandAfter: m.on_hand_after,
      reason: m.reason ?? '',
      createdAt: m.created_at,
    })
  );

  const productData: EditableProductData = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    categoryId: product.category_id,
    brandId: product.brand_id,
    shortDescription: product.short_description ?? '',
    description: product.description ?? '',
    status: product.status,
    isFeatured: product.is_featured,
    containsFlammableLiquid: product.contains_flammable_liquid,
    containsLithiumBattery: product.contains_lithium_battery,
    lithiumBatteryType:
      product.lithium_battery_type === 'standalone_powerbank'
        ? 'standalone_powerbank'
        : product.lithium_battery_type === 'contained_in_equipment'
          ? 'contained_in_equipment'
          : 'none',
  };

  return (
    <EditProductClient
      product={productData}
      variants={variants}
      images={images}
      recentMovements={recentMovements}
      categories={categories ?? []}
      brands={brands ?? []}
    />
  );
}

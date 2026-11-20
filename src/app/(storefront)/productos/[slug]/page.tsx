import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getActiveProductDetailBySlug } from '@/modules/products/queries';
import { resolveEffectivePriceCentavos, centavosToPesosNumber } from '@/lib/money';
import type { ClientVariantOption } from '@/components/storefront/VariantSelectorClient';
import type { CarouselImageItem } from '@/components/storefront/ProductImageCarousel';
import { ProductDetailInteractive } from '@/components/storefront/ProductDetailInteractive';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getActiveProductDetailBySlug(slug);
  if (!product) {
    return { title: 'Producto no encontrado' };
  }

  return {
    title: product.seo_title || product.name,
    description:
      product.seo_description ||
      product.short_description ||
      `Comprá ${product.name} en Zyven Store con envío desde Alejandro Korn, Buenos Aires.`,
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getActiveProductDetailBySlug(slug);

  if (!product) {
    notFound();
  }

  const rawVariants = Array.isArray(product.product_variants)
    ? [...product.product_variants]
        .filter((v) => v.status === 'active')
        .sort((a, b) => Number(b.is_default) - Number(a.is_default))
    : [];

  if (rawVariants.length === 0) {
    notFound();
  }

  const clientVariants: ClientVariantOption[] = rawVariants.map((v) => {
    const inv = Array.isArray(v.inventory_levels)
      ? v.inventory_levels[0]
      : v.inventory_levels;
    const availableStock = Math.max(0, inv?.available ?? 0);
    const lowThreshold = inv?.low_stock_threshold ?? 2;
    const priceInfo = resolveEffectivePriceCentavos({
      priceCentavos: v.price_centavos,
      promotionalPriceCentavos: v.promotional_price_centavos,
      promoStartsAt: v.promo_starts_at,
      promoEndsAt: v.promo_ends_at,
    });

    const optValues: Record<string, string> = {};
    if (v.option_values && typeof v.option_values === 'object') {
      for (const [key, val] of Object.entries(
        v.option_values as Record<string, unknown>
      )) {
        if (val != null) optValues[key] = String(val);
      }
    }

    return {
      id: v.id,
      sku: v.sku,
      title: v.title,
      optionValues: optValues,
      effectivePriceCentavos: priceInfo.effectivePriceCentavos,
      compareAtPriceCentavos: priceInfo.compareAtPriceCentavos,
      discountPercentage: priceInfo.discountPercentage,
      availableStock,
      isLowStock: availableStock > 0 && availableStock <= lowThreshold,
    };
  });

  const rawImages = Array.isArray(product.product_images)
    ? [...product.product_images].sort((a, b) => a.sort_order - b.sort_order)
    : [];

  const carouselImages: CarouselImageItem[] = rawImages.map((img) => ({
    id: img.id,
    variantId: img.variant_id,
    publicUrl: img.public_url,
    altText: img.alt_text || product.name,
    isPrimary: img.is_primary,
    sortOrder: img.sort_order,
  }));

  const category = Array.isArray(product.categories)
    ? product.categories[0]
    : product.categories;
  const brand = Array.isArray(product.brands)
    ? product.brands[0]
    : product.brands;

  const attributesObj =
    product.attributes && typeof product.attributes === 'object'
      ? (product.attributes as Record<string, unknown>)
      : {};

  const optionNames = Array.isArray(product.option_names)
    ? product.option_names.map((n) => String(n))
    : [];

  const firstVariant = clientVariants[0]!;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: carouselImages.map((i) => i.publicUrl),
    description: product.short_description ?? product.description ?? product.name,
    sku: firstVariant.sku,
    brand: brand ? { '@type': 'Brand', name: brand.name } : undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'ARS',
      price: centavosToPesosNumber(firstVariant.effectivePriceCentavos),
      availability:
        firstVariant.availableStock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="mb-6 flex items-center gap-2 text-xs text-neutral-500">
        <Link href="/" className="hover:text-[#7B19EC]">
          Inicio
        </Link>
        <span>/</span>
        <Link href="/productos" className="hover:text-[#7B19EC]">
          Catálogo
        </Link>
        {category ? (
          <>
            <span>/</span>
            <Link
              href={`/categoria/${category.slug}`}
              className="hover:text-[#7B19EC]"
            >
              {category.name}
            </Link>
          </>
        ) : null}
      </nav>

      <ProductDetailInteractive
        productName={product.name}
        shortDescription={product.short_description}
        brandName={brand?.name ?? null}
        categoryName={category?.name ?? null}
        containsFlammableLiquid={product.contains_flammable_liquid}
        containsLithiumBattery={product.contains_lithium_battery}
        attributes={attributesObj}
        optionNames={optionNames}
        variants={clientVariants}
        images={carouselImages}
      />
    </div>
  );
}

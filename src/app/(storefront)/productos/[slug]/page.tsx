import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Package, ShieldCheck, Truck, Info } from 'lucide-react';
import { getActiveProductDetailBySlug } from '@/modules/products/queries';
import { resolveEffectivePriceCentavos, centavosToPesosNumber } from '@/lib/money';
import {
  VariantSelectorClient,
  type ClientVariantOption,
} from '@/components/storefront/VariantSelectorClient';
import { Badge } from '@/components/ui/badge';

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
    ? product.product_variants.filter((v) => v.status === 'active')
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

    return {
      id: v.id,
      sku: v.sku,
      title: v.title,
      effectivePriceCentavos: priceInfo.effectivePriceCentavos,
      compareAtPriceCentavos: priceInfo.compareAtPriceCentavos,
      discountPercentage: priceInfo.discountPercentage,
      availableStock,
      isLowStock: availableStock > 0 && availableStock <= lowThreshold,
    };
  });

  const images = Array.isArray(product.product_images)
    ? product.product_images
    : [];
  const primaryImage = images.find((i) => i.is_primary) ?? images[0] ?? null;

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

  const firstVariant = clientVariants[0]!;

  // Datos estructurados JSON-LD (Schema.org Product en ARS)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
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

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        {/* Galería de imágenes */}
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50">
          {primaryImage ? (
            <Image
              src={primaryImage.public_url}
              alt={primaryImage.alt_text || product.name}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-neutral-400">
              <Package className="h-16 w-16 text-neutral-300" />
              <span className="text-sm font-medium">{product.name}</span>
            </div>
          )}
        </div>

        {/* Información comercial y selector de variantes */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2">
              {brand ? (
                <Badge variant="violetSoft">{brand.name}</Badge>
              ) : null}
              {category ? (
                <Badge variant="secondary">{category.name}</Badge>
              ) : null}
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-[#111111] sm:text-3xl">
              {product.name}
            </h1>
            {product.short_description ? (
              <p className="mt-2 text-sm text-neutral-600">
                {product.short_description}
              </p>
            ) : null}
          </div>

          <VariantSelectorClient variants={clientVariants} />

          {/* Avisos logísticos de transporte (Sección 10) */}
          {product.contains_flammable_liquid ||
          product.contains_lithium_battery ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-neutral-200 bg-neutral-50 p-3.5 text-xs text-neutral-600">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#7B19EC]" />
              <span>
                Este artículo cuenta con embalaje protector reforzado y se
                despacha exclusivamente mediante modalidades terrestres
                habilitadas desde nuestro depósito en Alejandro Korn.
              </span>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 border-t border-neutral-200 pt-5 text-xs text-neutral-600 sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-[#7B19EC]" />
              <span>Despacho directo desde Alejandro Korn (CP 1864)</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#7B19EC]" />
              <span>Compra protegida con Mercado Pago</span>
            </div>
          </div>

          {/* Atributos flexibles del rubro (JSONB) */}
          {Object.keys(attributesObj).length > 0 ? (
            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#111111]">
                Especificaciones del producto
              </h2>
              <dl className="mt-3 divide-y divide-neutral-100 text-sm">
                {Object.entries(attributesObj).map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-center justify-between py-2"
                  >
                    <dt className="capitalize text-neutral-500">
                      {k.replace(/_/g, ' ')}
                    </dt>
                    <dd className="font-medium text-[#111111]">
                      {typeof v === 'boolean' ? (v ? 'Sí' : 'No') : String(v)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

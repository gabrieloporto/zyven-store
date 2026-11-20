import { getImageProps } from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Sparkles,
  Headphones,
  Shirt,
  ShieldCheck,
  PackageCheck,
  CreditCard,
  Truck,
} from 'lucide-react';
import { ZYVEN_BRAND } from '@/lib/brand';
import { getActiveCatalogProducts } from '@/modules/products/queries';
import { ProductCard } from '@/components/storefront/ProductCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const featuredCategories = [
  {
    slug: 'perfumes',
    name: 'Perfumes',
    description:
      'Fragancias internacionales seleccionadas: Jean Paul Gaultier, Valentino, Xerjoff, Emporio Armani, Paco Rabanne y Carolina Herrera.',
    icon: Sparkles,
    badge: 'Fragancias Originales',
  },
  {
    slug: 'tecnologia',
    name: 'Tecnología y Audio',
    description:
      'Auriculares AirPods Pro, parlantes portátiles Bluetooth JBL GO 4 en 6 colores, cargadores MagSafe y cables Apple.',
    icon: Headphones,
    badge: 'Audio & Accesorios',
  },
  {
    slug: 'indumentaria',
    name: 'Indumentaria',
    description:
      'Prendas deportivas y urbanas seleccionadas como Nike Pro Dri-FIT con gestión de talles, colores y stock real.',
    icon: Shirt,
    badge: 'Estilo & Confort',
  },
] as const;

const storePillars = [
  {
    icon: PackageCheck,
    title: 'Stock Propio Real',
    description:
      'Cada unidad publicada se encuentra verificada y almacenada en nuestro depósito para preparación inmediata.',
  },
  {
    icon: CreditCard,
    title: 'Mercado Pago Checkout Pro',
    description:
      'Aboná con tarjeta de débito, crédito o dinero en cuenta con confirmación segura y protegida.',
  },
  {
    icon: Truck,
    title: 'Despacho desde Alejandro Korn',
    description:
      'Embalaje protegido especial para fragancias y dispositivos electrónicos con seguimiento en cada etapa.',
  },
  {
    icon: ShieldCheck,
    title: 'Garantía y Posventa Directa',
    description:
      'Atención personalizada y gestión clara de cambios, devoluciones y facturación.',
  },
] as const;

export default async function HomePage() {
  const { items: allProducts } = await getActiveCatalogProducts({
    pageSize: 24,
    sortBy: 'featured',
  });

  // Seleccionar los productos destacados (is_featured) garantizando presencia de las 3 categorías
  const featuredProducts = allProducts.filter((p) => p.isFeatured);
  const showcaseProducts =
    featuredProducts.length > 0 ? featuredProducts.slice(0, 8) : allProducts.slice(0, 8);

  // Art Direction con getImageProps + <picture>: descarga únicamente la versión desktop o mobile en alta calidad (quality: 95)
  const {
    props: { srcSet: desktopBannerSrcSet },
  } = getImageProps({
    src: ZYVEN_BRAND.assets.heroBannerDesktop.src,
    alt: ZYVEN_BRAND.assets.heroBannerDesktop.alt,
    width: ZYVEN_BRAND.assets.heroBannerDesktop.width,
    height: ZYVEN_BRAND.assets.heroBannerDesktop.height,
    quality: 95,
    priority: true,
    sizes: '100vw',
  });

  const {
    props: { srcSet: mobileBannerSrcSet, ...mobileBannerImgProps },
  } = getImageProps({
    src: ZYVEN_BRAND.assets.heroBannerMobile.src,
    alt: ZYVEN_BRAND.assets.heroBannerMobile.alt,
    width: ZYVEN_BRAND.assets.heroBannerMobile.width,
    height: ZYVEN_BRAND.assets.heroBannerMobile.height,
    quality: 95,
    priority: true,
    sizes: '100vw',
  });

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Principal Responsive (Desktop 3584x1184 y Mobile 1536x2752 en máxima nitidez) */}
      <section
        aria-label="Presentación principal de Zyven Store"
        className="w-full bg-[#111111]"
      >
        <div className="relative w-full overflow-hidden">
          <picture>
            <source
              media="(min-width: 768px)"
              srcSet={desktopBannerSrcSet}
              width={ZYVEN_BRAND.assets.heroBannerDesktop.width}
              height={ZYVEN_BRAND.assets.heroBannerDesktop.height}
            />
            <source
              media="(max-width: 767px)"
              srcSet={mobileBannerSrcSet}
              width={ZYVEN_BRAND.assets.heroBannerMobile.width}
              height={ZYVEN_BRAND.assets.heroBannerMobile.height}
            />
            <img
              {...mobileBannerImgProps}
              alt={ZYVEN_BRAND.assets.heroBannerDesktop.alt}
              className="block h-auto w-full object-cover"
            />
          </picture>
        </div>

        {/* Barra de acción inferior del Hero */}
        <div className="border-t border-white/10 bg-[#111111]">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 py-5 sm:flex-row sm:items-center sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="default">Tienda Oficial</Badge>
              <p className="text-sm text-neutral-300">
                Comprá directo sin intermediarios en Pesos Argentinos (ARS).
              </p>
            </div>
            <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/productos">
                  Explorar Catálogo
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full border-white/20 bg-transparent text-white hover:border-[#7B19EC] hover:bg-white/5 hover:text-white sm:w-auto"
              >
                <Link href="/categoria/perfumes">Ver Perfumes</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Productos Destacados de las 3 Categorías (Punto 1) */}
      <section
        aria-labelledby="heading-destacados"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
      >
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <Badge variant="violetSoft" className="mb-2">
              Selección Destacada
            </Badge>
            <h2
              id="heading-destacados"
              className="text-2xl font-bold tracking-tight text-[#111111] sm:text-3xl"
            >
              Lo más buscado en Perfumes, Tecnología e Indumentaria
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              Productos originales con stock propio listo para despachar desde
              Alejandro Korn.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/categoria/perfumes"
              className="rounded-full border border-neutral-200 px-3.5 py-1.5 text-xs font-semibold text-[#111111] transition-colors hover:border-[#7B19EC] hover:text-[#7B19EC]"
            >
              Perfumes
            </Link>
            <Link
              href="/categoria/tecnologia"
              className="rounded-full border border-neutral-200 px-3.5 py-1.5 text-xs font-semibold text-[#111111] transition-colors hover:border-[#7B19EC] hover:text-[#7B19EC]"
            >
              Tecnología
            </Link>
            <Link
              href="/categoria/indumentaria"
              className="rounded-full border border-neutral-200 px-3.5 py-1.5 text-xs font-semibold text-[#111111] transition-colors hover:border-[#7B19EC] hover:text-[#7B19EC]"
            >
              Indumentaria
            </Link>
            <Link
              href="/productos"
              className="ml-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[#7B19EC] hover:underline"
            >
              Ver todo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {showcaseProducts.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {showcaseProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : null}
      </section>

      {/* Categorías Principales */}
      <section
        aria-labelledby="heading-categorias"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
      >
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <Badge variant="violetSoft" className="mb-2">
              Categorías de la tienda
            </Badge>
            <h2
              id="heading-categorias"
              className="text-2xl font-bold tracking-tight text-[#111111] sm:text-3xl"
            >
              Explorá por categoría
            </h2>
          </div>
          <Link
            href="/productos"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#7B19EC] hover:underline"
          >
            Ver catálogo completo
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {featuredCategories.map((category) => {
            const Icon = category.icon;
            return (
              <Link
                key={category.slug}
                href={`/categoria/${category.slug}`}
                className="group relative flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs transition-all hover:border-[#7B19EC] hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#F3E8FF] text-[#7B19EC] transition-colors group-hover:bg-[#7B19EC] group-hover:text-white">
                      <Icon className="h-6 w-6" />
                    </span>
                    <Badge variant="secondary">{category.badge}</Badge>
                  </div>
                  <h3 className="mt-5 text-xl font-bold text-[#111111] transition-colors group-hover:text-[#7B19EC]">
                    {category.name}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                    {category.description}
                  </p>
                </div>

                <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#7B19EC]">
                  <span>Explorar {category.name}</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Pilares operativos del negocio */}
      <section
        aria-label="Beneficios de comprar en Zyven Store"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
      >
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-6 sm:p-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {storePillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div key={pillar.title} className="space-y-2.5">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#111111] text-white">
                    <Icon className="h-5 w-5 text-[#7B19EC]" />
                  </div>
                  <h3 className="text-base font-bold text-[#111111]">
                    {pillar.title}
                  </h3>
                  <p className="text-xs leading-relaxed text-neutral-600">
                    {pillar.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

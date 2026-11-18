import Image from 'next/image';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const featuredCategories = [
  {
    slug: 'perfumes',
    name: 'Perfumes',
    description:
      'Fragancias internacionales seleccionadas: Jean Paul Gaultier, Valentino, Xerjoff, Paco Rabanne y Carolina Herrera.',
    icon: Sparkles,
    badge: 'Fragancias Originales',
  },
  {
    slug: 'tecnologia',
    name: 'Tecnología y Audio',
    description:
      'Auriculares inalámbricos, parlantes portátiles Bluetooth JBL, cargadores MagSafe y accesorios de carga rápida.',
    icon: Headphones,
    badge: 'Audio & Accesorios',
  },
  {
    slug: 'indumentaria',
    name: 'Indumentaria',
    description:
      'Prendas deportivas y urbanas seleccionadas con gestión de talles y stock real en depósito.',
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

export default function HomePage() {
  return (
    <div className="space-y-16 pb-20">
      {/* Hero Principal utilizando zyven-banner-principal-v2.webp (1920x640, proporción 3:1 intacta) */}
      <section aria-label="Presentación principal de Zyven Store" className="bg-[#111111]">
        <div className="mx-auto max-w-7xl">
          <div className="relative overflow-hidden">
            <Image
              src={ZYVEN_BRAND.assets.heroBanner.src}
              alt={ZYVEN_BRAND.assets.heroBanner.alt}
              width={ZYVEN_BRAND.assets.heroBanner.width}
              height={ZYVEN_BRAND.assets.heroBanner.height}
              priority
              sizes="(max-width: 1280px) 100vw, 1280px"
              className="w-full h-auto object-cover"
            />
          </div>

          {/* Barra de acción inferior del Hero (sin tapar el texto original del banner) */}
          <div className="flex flex-col items-start justify-between gap-4 border-t border-white/10 bg-[#111111] px-4 py-5 sm:flex-row sm:items-center sm:px-6 lg:px-8">
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

      {/* Categorías Principales sobre fondo blanco predominante (#FFFFFF) */}
      <section
        aria-labelledby="heading-categorias"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
      >
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <Badge variant="violetSoft" className="mb-2">
              Categorías de la tienda
            </Badge>
            <h1
              id="heading-categorias"
              className="text-2xl font-bold tracking-tight text-[#111111] sm:text-3xl"
            >
              Elegí qué estás buscando hoy
            </h1>
          </div>
          <Link
            href="/productos"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#7B19EC] hover:underline"
          >
            Ver todos los productos
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
                  <h2 className="mt-5 text-xl font-bold text-[#111111] group-hover:text-[#7B19EC] transition-colors">
                    {category.name}
                  </h2>
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

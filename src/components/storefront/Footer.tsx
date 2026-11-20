import Link from 'next/link';
import Image from 'next/image';
import { MapPin, ShieldCheck, PackageCheck } from 'lucide-react';
import { ZYVEN_BRAND } from '@/lib/brand';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-neutral-200 bg-[#111111] text-neutral-300">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          {/* Columna 1: Marca */}
          <div className="space-y-4 md:col-span-2">
            <Link href="/" className="inline-block">
              <Image
                src={ZYVEN_BRAND.assets.logoTransparent.src}
                alt={ZYVEN_BRAND.assets.logoTransparent.alt}
                width={ZYVEN_BRAND.assets.logoTransparent.width}
                height={ZYVEN_BRAND.assets.logoTransparent.height}
                className="h-12 w-auto object-contain"
              />
            </Link>
            <p className="max-w-md text-sm leading-relaxed text-neutral-400">
              {ZYVEN_BRAND.tagline}. {ZYVEN_BRAND.subtitle} Operamos con stock
              propio verificado, preparación directa y despacho desde nuestro
              depósito en Provincia de Buenos Aires.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-neutral-300">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                <MapPin className="h-3.5 w-3.5 text-[#7B19EC]" />
                {ZYVEN_BRAND.location.locality}, {ZYVEN_BRAND.location.party} (
                {ZYVEN_BRAND.location.province} — CP{' '}
                {ZYVEN_BRAND.location.postalCode})
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                <PackageCheck className="h-3.5 w-3.5 text-[#7B19EC]" />
                Stock propio real
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                <ShieldCheck className="h-3.5 w-3.5 text-[#7B19EC]" />
                Mercado Pago Checkout Pro
              </span>
            </div>
          </div>

          {/* Columna 2: Categorías */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              Categorías
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link
                  href="/categoria/perfumes"
                  className="hover:text-[#7B19EC] transition-colors"
                >
                  Perfumes y Fragancias
                </Link>
              </li>
              <li>
                <Link
                  href="/categoria/tecnologia"
                  className="hover:text-[#7B19EC] transition-colors"
                >
                  Auriculares, Parlantes y Tecnología
                </Link>
              </li>
              <li>
                <Link
                  href="/categoria/indumentaria"
                  className="hover:text-[#7B19EC] transition-colors"
                >
                  Indumentaria
                </Link>
              </li>
              <li>
                <Link
                  href="/productos"
                  className="hover:text-[#7B19EC] transition-colors"
                >
                  Ver todo el catálogo
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna 3: Atención y Cuenta (sin enlaces administrativos expuestos a clientes) */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              Mi Compra
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link
                  href="/cuenta"
                  className="hover:text-[#7B19EC] transition-colors"
                >
                  Mi Cuenta y Mis Pedidos
                </Link>
              </li>
              <li>
                <Link
                  href="/carrito"
                  className="hover:text-[#7B19EC] transition-colors"
                >
                  Carrito de Compras
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="hover:text-[#7B19EC] transition-colors"
                >
                  Iniciar Sesión / Registrarse
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-neutral-400 sm:flex-row">
          <p>
            © {currentYear} {ZYVEN_BRAND.name}. Todos los derechos reservados.
            Precios expresados en Pesos Argentinos (ARS).
          </p>
          <p>
            {ZYVEN_BRAND.location.locality}, {ZYVEN_BRAND.location.party},{' '}
            {ZYVEN_BRAND.location.province}, {ZYVEN_BRAND.location.country}
          </p>
        </div>
      </div>
    </footer>
  );
}

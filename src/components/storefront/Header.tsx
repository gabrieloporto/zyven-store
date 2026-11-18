import Link from 'next/link';
import Image from 'next/image';
import {
  ShoppingBag,
  Search,
  User,
  MapPin,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { ZYVEN_BRAND } from '@/lib/brand';

const mainNavLinks = [
  { href: '/productos', label: 'Catálogo' },
  { href: '/categoria/perfumes', label: 'Perfumes' },
  { href: '/categoria/tecnologia', label: 'Tecnología' },
  { href: '/categoria/indumentaria', label: 'Indumentaria' },
] as const;

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full bg-[#111111] text-white shadow-sm">
      {/* Barra informativa superior */}
      <div className="border-b border-white/10 bg-[#111111] text-xs text-neutral-300">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-[#7B19EC]" />
              <span>
                Despacho propio desde {ZYVEN_BRAND.location.locality},{' '}
                {ZYVEN_BRAND.location.province} (CP{' '}
                {ZYVEN_BRAND.location.postalCode})
              </span>
            </span>
          </div>
          <div className="hidden items-center gap-5 md:flex">
            <span className="inline-flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5 text-[#7B19EC]" />
              <span>Envíos a todo el país</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-[#7B19EC]" />
              <span>Pagá seguro con Mercado Pago</span>
            </span>
          </div>
        </div>
      </div>

      {/* Barra de navegación principal (Fondo #111111 para contraste óptimo con zyven-logo-transparente.webp) */}
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B19EC] rounded-md"
            aria-label="Ir al inicio de Zyven Store"
          >
            <Image
              src={ZYVEN_BRAND.assets.logoTransparent.src}
              alt={ZYVEN_BRAND.assets.logoTransparent.alt}
              width={ZYVEN_BRAND.assets.logoTransparent.width}
              height={ZYVEN_BRAND.assets.logoTransparent.height}
              priority
              className="h-12 w-auto object-contain sm:h-14"
            />
          </Link>

          <nav
            aria-label="Navegación principal"
            className="hidden items-center gap-6 lg:flex"
          >
            {mainNavLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-neutral-200 transition-colors hover:text-[#7B19EC]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Buscador rápido y acciones de usuario/carrito */}
        <div className="flex flex-1 items-center justify-end gap-3 sm:gap-4 max-w-md">
          <form
            action="/productos"
            method="GET"
            role="search"
            className="relative hidden sm:block w-full max-w-xs"
          >
            <input
              type="search"
              name="q"
              placeholder="Buscar perfumes, audio, accesorios..."
              aria-label="Buscar productos en Zyven Store"
              className="h-10 w-full rounded-lg border border-white/15 bg-white/10 pl-3.5 pr-9 text-sm text-white placeholder:text-neutral-400 focus:border-[#7B19EC] focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-[#7B19EC]"
            />
            <button
              type="submit"
              aria-label="Buscar"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-300 hover:text-white cursor-pointer"
            >
              <Search className="h-4 w-4" />
            </button>
          </form>

          <Link
            href="/productos"
            aria-label="Buscar en catálogo"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-neutral-200 hover:border-[#7B19EC] hover:text-white sm:hidden"
          >
            <Search className="h-5 w-5" />
          </Link>

          <Link
            href="/cuenta"
            aria-label="Mi cuenta"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 px-3 text-sm font-medium text-neutral-200 transition-colors hover:border-[#7B19EC] hover:text-white"
          >
            <User className="h-4 w-4 text-[#7B19EC]" />
            <span className="hidden md:inline">Cuenta</span>
          </Link>

          <Link
            href="/carrito"
            aria-label="Ver carrito de compras"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#7B19EC] px-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#6612C9]"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Carrito</span>
          </Link>
        </div>
      </div>

      {/* Navegación móvil de acceso rápido */}
      <nav
        aria-label="Categorías móviles"
        className="flex items-center gap-5 overflow-x-auto border-t border-white/10 px-4 py-2 text-xs font-medium text-neutral-300 lg:hidden"
      >
        {mainNavLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="whitespace-nowrap transition-colors hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

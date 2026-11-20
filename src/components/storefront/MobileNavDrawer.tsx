'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Menu,
  X,
  Search,
  Home,
  LayoutGrid,
  Sparkles,
  Headphones,
  Shirt,
  User,
  ShoppingBag,
  LayoutDashboard,
  MapPin,
} from 'lucide-react';
import { ZYVEN_BRAND } from '@/lib/brand';

const mobileMenuLinks = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/productos', label: 'Todo el Catálogo', icon: LayoutGrid },
  { href: '/categoria/perfumes', label: 'Perfumes', icon: Sparkles },
  { href: '/categoria/tecnologia', label: 'Tecnología', icon: Headphones },
  { href: '/categoria/indumentaria', label: 'Indumentaria', icon: Shirt },
] as const;

export function MobileNavDrawer({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    setOpen(false);
    if (trimmed.length > 0) {
      router.push(`/productos?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push('/productos');
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label="Abrir menú de navegación"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white transition-colors hover:border-[#7B19EC] hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B19EC] lg:hidden cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs lg:hidden" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-0 top-0 z-50 flex h-full w-[85vw] max-w-xs flex-col bg-[#111111] text-white shadow-2xl focus:outline-none lg:hidden"
        >
          {/* Cabecera del menú mobile */}
          <div className="flex h-20 items-center justify-between border-b border-white/10 px-5">
            <Dialog.Title className="sr-only">Menú de navegación</Dialog.Title>
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="flex items-center"
            >
              <Image
                src={ZYVEN_BRAND.assets.logoTransparent.src}
                alt={ZYVEN_BRAND.assets.logoTransparent.alt}
                width={ZYVEN_BRAND.assets.logoTransparent.width}
                height={ZYVEN_BRAND.assets.logoTransparent.height}
                className="h-10 w-auto object-contain"
              />
            </Link>

            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Cerrar menú"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-300 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Buscador integrado */}
          <div className="border-b border-white/10 p-4">
            <form onSubmit={handleSearchSubmit} role="search" className="relative">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar perfumes, audio, ropa..."
                aria-label="Buscar productos"
                className="h-10 w-full rounded-lg border border-white/15 bg-white/10 pl-3.5 pr-10 text-sm text-white placeholder:text-neutral-400 focus:border-[#7B19EC] focus:outline-none focus:ring-2 focus:ring-[#7B19EC]"
              />
              <button
                type="submit"
                aria-label="Ejecutar búsqueda"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-300 hover:text-white cursor-pointer"
              >
                <Search className="h-4 w-4" />
              </button>
            </form>
          </div>

          {/* Enlaces principales */}
          <nav
            aria-label="Menú principal móvil"
            className="flex-1 overflow-y-auto px-3 py-4"
          >
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Tienda
            </p>
            <ul className="space-y-1">
              {mobileMenuLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-neutral-200 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <Icon className="h-4 w-4 text-[#7B19EC]" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="my-4 border-t border-white/10" />

            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Mi Compra
            </p>
            <ul className="space-y-1">
              <li>
                <Link
                  href="/cuenta"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-neutral-200 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <User className="h-4 w-4 text-[#7B19EC]" />
                  <span>Mi Cuenta</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/carrito"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-neutral-200 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <ShoppingBag className="h-4 w-4 text-[#7B19EC]" />
                  <span>Mi Carrito</span>
                </Link>
              </li>
              {isAdmin ? (
                <li>
                  <Link
                    href="/admin"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl bg-[#7B19EC]/20 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#7B19EC]"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Panel Admin</span>
                  </Link>
                </li>
              ) : null}
            </ul>
          </nav>

          {/* Pie informativo */}
          <div className="border-t border-white/10 p-4 text-xs text-neutral-400">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[#7B19EC]" />
              <span>
                {ZYVEN_BRAND.location.locality}, {ZYVEN_BRAND.location.province}{' '}
                (CP {ZYVEN_BRAND.location.postalCode})
              </span>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

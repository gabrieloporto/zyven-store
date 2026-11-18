import Link from 'next/link';
import Image from 'next/image';
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  FileText,
  RotateCcw,
  Settings,
  ExternalLink,
} from 'lucide-react';
import { requireAdminPageAccess } from '@/lib/security/auth-guards';
import { ZYVEN_BRAND } from '@/lib/brand';
import { Badge } from '@/components/ui/badge';

const adminNavItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/productos', label: 'Productos y Catálogo', icon: Package },
  { href: '/admin/inventario', label: 'Inventario y Stock', icon: Boxes },
  { href: '/admin/ordenes', label: 'Órdenes y Pagos', icon: ShoppingCart },
  { href: '/admin/facturacion', label: 'Facturación Manual', icon: FileText },
  { href: '/admin/devoluciones', label: 'Devoluciones y RMA', icon: RotateCcw },
  { href: '/admin/configuracion', label: 'Configuración', icon: Settings },
] as const;

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Protección obligatoria en servidor: verifica sesión y rol contra public.profiles
  const adminProfile = await requireAdminPageAccess();

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 lg:flex-row">
      {/* Sidebar Administrativo (#111111 con acento #7B19EC) */}
      <aside className="w-full shrink-0 bg-[#111111] text-white lg:w-64 lg:min-h-screen">
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-5">
          <Link href="/admin" className="flex items-center gap-2.5">
            <Image
              src={ZYVEN_BRAND.assets.logoTransparent.src}
              alt={ZYVEN_BRAND.assets.logoTransparent.alt}
              width={ZYVEN_BRAND.assets.logoTransparent.width}
              height={ZYVEN_BRAND.assets.logoTransparent.height}
              className="h-10 w-auto object-contain"
            />
          </Link>
          <Badge variant="default">Admin</Badge>
        </div>

        <nav className="flex gap-1 overflow-x-auto p-3 lg:flex-col">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-medium text-neutral-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Icon className="h-4 w-4 text-[#7B19EC]" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="hidden border-t border-white/10 p-4 text-xs text-neutral-400 lg:block">
          <p className="font-semibold text-white">
            {adminProfile.full_name || adminProfile.email}
          </p>
          <p className="mt-0.5 capitalize">Rol: {adminProfile.role}</p>
          <Link
            href="/"
            className="mt-3 inline-flex items-center gap-1.5 text-[#7B19EC] hover:underline"
          >
            <span>Ver tienda pública</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 p-6 sm:p-8 lg:p-10">{children}</div>
    </div>
  );
}

import Link from 'next/link';
import {
  AlertTriangle,
  Package,
  ShoppingCart,
  FileText,
  Boxes,
} from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatArs } from '@/lib/money';
import { Badge } from '@/components/ui/badge';

export default async function AdminDashboardPage() {
  const supabase = await createSupabaseServerClient();

  const [
    { count: totalProducts },
    { count: draftProducts },
    { count: unconfirmedProducts },
    { data: lowStockItems },
    { data: recentOrders },
  ] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'draft'),
    supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('commercial_name_confirmed', false),
    supabase
      .from('inventory_levels')
      .select('variant_id, on_hand, reserved, available, low_stock_threshold, product_variants(sku, title, products(name))')
      .lte('available', 2)
      .limit(10),
    supabase
      .from('orders')
      .select('id, order_number, buyer_full_name, total_centavos, order_status, payment_status, billing_status, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const manualReviewCount = (recentOrders ?? []).filter(
    (o) => o.order_status === 'manual_review'
  ).length;
  const pendingBillingCount = (recentOrders ?? []).filter(
    (o) => o.payment_status === 'approved' && o.billing_status !== 'invoiced'
  ).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#111111]">
          Dashboard Comercial — Zyven Store
        </h1>
        <p className="text-sm text-neutral-600">
          Operación y despacho: Depósito Alejandro Korn (San Vicente, Buenos
          Aires — CP 1864)
        </p>
      </div>

      {/* Alertas críticas operativas */}
      {manualReviewCount > 0 || (unconfirmedProducts ?? 0) > 0 ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <span>Atención requerida en operación comercial</span>
          </div>
          {manualReviewCount > 0 ? (
            <p>
              • Existen <strong>{manualReviewCount}</strong> órdenes en{' '}
              <strong>Revisión Manual (Pago Tardío)</strong>. No habilites el
              despacho sin verificar stock o reembolsar en{' '}
              <Link href="/admin/ordenes" className="font-bold underline">
                Órdenes
              </Link>
              .
            </p>
          ) : null}
          {(unconfirmedProducts ?? 0) > 0 ? (
            <p>
              • Existen <strong>{unconfirmedProducts}</strong> productos en
              borrador con nombre comercial pendiente de confirmar (Sección
              26.D). Revisalos en{' '}
              <Link href="/admin/productos" className="font-bold underline">
                Productos
              </Link>
              .
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Métricas principales */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-bold uppercase">Catálogo Total</span>
            <Package className="h-4 w-4 text-[#7B19EC]" />
          </div>
          <p className="mt-3 text-3xl font-bold text-[#111111]">
            {totalProducts ?? 0}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {draftProducts ?? 0} en estado borrador (draft)
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-bold uppercase">Alertas de Stock</span>
            <Boxes className="h-4 w-4 text-[#7B19EC]" />
          </div>
          <p className="mt-3 text-3xl font-bold text-[#111111]">
            {lowStockItems?.length ?? 0}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Variantes con stock disponible ≤ umbral
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-bold uppercase">
              Pendientes Facturar
            </span>
            <FileText className="h-4 w-4 text-[#7B19EC]" />
          </div>
          <p className="mt-3 text-3xl font-bold text-[#111111]">
            {pendingBillingCount}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Órdenes cobradas sin factura completa
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-bold uppercase">
              Revisión Manual
            </span>
            <ShoppingCart className="h-4 w-4 text-[#7B19EC]" />
          </div>
          <p className="mt-3 text-3xl font-bold text-[#111111]">
            {manualReviewCount}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Pagos tardíos o anomalías bloqueadas
          </p>
        </div>
      </div>

      {/* Últimas órdenes */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#111111]">Pedidos Recientes</h2>
          <Link
            href="/admin/ordenes"
            className="text-sm font-semibold text-[#7B19EC] hover:underline"
          >
            Ver todas las órdenes
          </Link>
        </div>

        {!recentOrders || recentOrders.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">
            Aún no se registraron órdenes de compra.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 text-xs uppercase text-neutral-500">
                <tr>
                  <th className="py-3 pr-4">Orden</th>
                  <th className="py-3 px-4">Comprador</th>
                  <th className="py-3 px-4">Estado Orden</th>
                  <th className="py-3 px-4">Pago</th>
                  <th className="py-3 px-4">Facturación</th>
                  <th className="py-3 pl-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td className="py-3 pr-4 font-mono font-semibold">
                      {o.order_number}
                    </td>
                    <td className="py-3 px-4">{o.buyer_full_name}</td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          o.order_status === 'manual_review'
                            ? 'warning'
                            : 'secondary'
                        }
                      >
                        {o.order_status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          o.payment_status === 'approved'
                            ? 'success'
                            : 'outline'
                        }
                      >
                        {o.payment_status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline">{o.billing_status}</Badge>
                    </td>
                    <td className="py-3 pl-4 text-right font-semibold">
                      {formatArs(o.total_centavos)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

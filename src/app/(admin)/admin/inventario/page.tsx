import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { InventoryRowAdjustmentClient } from '@/components/admin/InventoryRowAdjustmentClient';

export default async function AdminInventoryPage() {
  const supabase = await createSupabaseServerClient();

  const { data: levels } = await supabase
    .from('inventory_levels')
    .select(
      `
      variant_id,
      on_hand,
      reserved,
      available,
      low_stock_threshold,
      updated_at,
      product_variants(sku, title, product_id, products(id, name))
    `
    )
    .order('available', { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111111]">
          Inventario y Control de Stock Propio
        </h1>
        <p className="text-sm text-neutral-600">
          Depósito Único: Alejandro Korn (CP 1864). Invariante transaccional
          activo: <code>on_hand &gt;= reserved</code>. Cada ajuste queda
          registrado en <code>inventory_movements</code>.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
            <tr>
              <th className="py-3.5 pl-5 pr-4">SKU</th>
              <th className="py-3.5 px-4">Producto / Variante</th>
              <th className="py-3.5 px-4 text-right">Físico (on_hand)</th>
              <th className="py-3.5 px-4 text-right">Reservado</th>
              <th className="py-3.5 px-4 text-right">Disponible</th>
              <th className="py-3.5 px-4">Alerta</th>
              <th className="py-3.5 pl-4 pr-5 text-right">Ajuste</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {(levels ?? []).map((row) => {
              const pv = Array.isArray(row.product_variants)
                ? row.product_variants[0]
                : row.product_variants;
              const prod = pv
                ? Array.isArray(pv.products)
                  ? pv.products[0]
                  : pv.products
                : null;
              const available = row.available ?? 0;
              const isLow = available <= row.low_stock_threshold;

              return (
                <tr key={row.variant_id}>
                  <td className="py-3.5 pl-5 pr-4 font-mono text-xs font-semibold">
                    {pv?.sku ?? '—'}
                  </td>
                  <td className="py-3.5 px-4">
                    {prod?.id ? (
                      <Link
                        href={`/admin/productos/${prod.id}`}
                        className="font-semibold text-[#111111] hover:text-[#7B19EC] hover:underline"
                      >
                        {prod.name}
                      </Link>
                    ) : (
                      <span className="font-semibold text-[#111111]">—</span>
                    )}{' '}
                    <span className="text-xs text-neutral-500">
                      ({pv?.title ?? ''})
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono">
                    {row.on_hand}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono">
                    {row.reserved}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold">
                    {available}
                  </td>
                  <td className="py-3.5 px-4">
                    {available === 0 ? (
                      <Badge variant="destructive">Sin stock</Badge>
                    ) : isLow ? (
                      <Badge variant="warning">Stock bajo</Badge>
                    ) : (
                      <Badge variant="success">OK</Badge>
                    )}
                  </td>
                  <td className="py-3.5 pl-4 pr-5 text-right">
                    <div className="flex justify-end">
                      <InventoryRowAdjustmentClient
                        variantId={row.variant_id}
                        sku={pv?.sku ?? ''}
                        lowStockThreshold={row.low_stock_threshold}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

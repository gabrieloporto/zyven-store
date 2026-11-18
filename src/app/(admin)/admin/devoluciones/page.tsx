import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';

export default async function AdminReturnsPage() {
  const supabase = await createSupabaseServerClient();

  const { data: returnsList } = await supabase
    .from('return_requests')
    .select('*, orders(order_number, buyer_full_name)')
    .order('created_at', { ascending: false })
    .limit(30);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111111]">
          Posventa — Devoluciones, Cambios y Reembolsos
        </h1>
        <p className="text-sm text-neutral-600">
          El stock devuelto solo se repone después de registrar la recepción e
          inspección física como apto para la venta (Sección 13).
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
            <tr>
              <th className="py-3.5 pl-5 pr-4">RMA</th>
              <th className="py-3.5 px-4">Orden Original</th>
              <th className="py-3.5 px-4">Motivo</th>
              <th className="py-3.5 px-4">Resolución</th>
              <th className="py-3.5 pl-4 pr-5">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {(returnsList ?? []).map((r) => {
              const ord = Array.isArray(r.orders) ? r.orders[0] : r.orders;
              return (
                <tr key={r.id}>
                  <td className="py-3.5 pl-5 pr-4 font-mono font-bold">
                    {r.return_number}
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    {ord?.order_number ?? '—'}
                  </td>
                  <td className="py-3.5 px-4">{r.reason_category}</td>
                  <td className="py-3.5 px-4">{r.resolution_type ?? 'Pendiente'}</td>
                  <td className="py-3.5 pl-4 pr-5">
                    <Badge variant="violetSoft">{r.status}</Badge>
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

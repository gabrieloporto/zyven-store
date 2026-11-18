import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatArs } from '@/lib/money';
import { Badge } from '@/components/ui/badge';

export default async function AdminOrdersPage() {
  const supabase = await createSupabaseServerClient();

  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111111]">
          Gestión de Órdenes, Pagos y Despachos
        </h1>
        <p className="text-sm text-neutral-600">
          Estados independientes: Orden · Pago · Preparación · Envío ·
          Facturación.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
            <tr>
              <th className="py-3.5 pl-5 pr-4">Orden</th>
              <th className="py-3.5 px-4">Cliente</th>
              <th className="py-3.5 px-4">Orden</th>
              <th className="py-3.5 px-4">Pago</th>
              <th className="py-3.5 px-4">Preparación</th>
              <th className="py-3.5 px-4">Envío</th>
              <th className="py-3.5 px-4">Facturación</th>
              <th className="py-3.5 pl-4 pr-5 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {(orders ?? []).map((o) => (
              <tr key={o.id}>
                <td className="py-4 pl-5 pr-4 font-mono font-bold">
                  {o.order_number}
                </td>
                <td className="py-4 px-4">
                  <div className="font-medium text-[#111111]">
                    {o.buyer_full_name}
                  </div>
                  <div className="text-xs text-neutral-500">{o.buyer_email}</div>
                </td>
                <td className="py-4 px-4">
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
                <td className="py-4 px-4">
                  <Badge
                    variant={
                      o.payment_status === 'approved' ? 'success' : 'outline'
                    }
                  >
                    {o.payment_status}
                  </Badge>
                </td>
                <td className="py-4 px-4">
                  <Badge variant="outline">{o.fulfillment_status}</Badge>
                </td>
                <td className="py-4 px-4">
                  <Badge variant="outline">{o.shipping_status}</Badge>
                </td>
                <td className="py-4 px-4">
                  <Badge variant="outline">{o.billing_status}</Badge>
                </td>
                <td className="py-4 pl-4 pr-5 text-right font-bold">
                  {formatArs(o.total_centavos)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

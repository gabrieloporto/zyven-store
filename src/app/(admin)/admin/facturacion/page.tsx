import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatArs } from '@/lib/money';
import { Badge } from '@/components/ui/badge';

export default async function AdminBillingPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: pendingOrders }, { data: documents }] = await Promise.all([
    supabase
      .from('orders')
      .select('id, order_number, buyer_full_name, buyer_document_type, buyer_document_number, total_centavos, payment_status, billing_status, created_at')
      .neq('billing_status', 'invoiced')
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('billing_documents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#111111]">
          Facturación — Operatoria Manual (Bucket Privado)
        </h1>
        <p className="text-sm text-neutral-600">
          Los comprobantes PDF se almacenan en el bucket privado{' '}
          <code>billing-documents</code> sin enlaces públicos, sin sobrescritura
          y con acceso exclusivo mediante URLs firmadas de 60 segundos.
        </p>
      </div>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-bold text-[#111111]">
          Pedidos pendientes de facturar ({pendingOrders?.length ?? 0})
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 text-xs uppercase text-neutral-500">
              <tr>
                <th className="py-3 pr-4">Orden</th>
                <th className="py-3 px-4">Receptor</th>
                <th className="py-3 px-4">Documento</th>
                <th className="py-3 px-4">Estado Pago</th>
                <th className="py-3 px-4">Estado Facturación</th>
                <th className="py-3 pl-4 text-right">Importe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {(pendingOrders ?? []).map((o) => (
                <tr key={o.id}>
                  <td className="py-3.5 pr-4 font-mono font-bold">
                    {o.order_number}
                  </td>
                  <td className="py-3.5 px-4">{o.buyer_full_name}</td>
                  <td className="py-3.5 px-4 font-mono text-xs">
                    {o.buyer_document_type} {o.buyer_document_number}
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge variant="outline">{o.payment_status}</Badge>
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge variant="warning">{o.billing_status}</Badge>
                  </td>
                  <td className="py-3.5 pl-4 text-right font-semibold">
                    {formatArs(o.total_centavos)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-bold text-[#111111]">
          Comprobantes emitidos registrados ({documents?.length ?? 0})
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 text-xs uppercase text-neutral-500">
              <tr>
                <th className="py-3 pr-4">Tipo y Número</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Receptor / Condición</th>
                <th className="py-3 px-4">CAE</th>
                <th className="py-3 pl-4 text-right">Importe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {(documents ?? []).map((doc) => (
                <tr key={doc.id}>
                  <td className="py-3.5 pr-4 font-mono font-bold">
                    {doc.document_type}{' '}
                    {String(doc.point_of_sale).padStart(5, '0')}-
                    {String(doc.document_number).padStart(8, '0')}
                  </td>
                  <td className="py-3.5 px-4">{doc.issue_date}</td>
                  <td className="py-3.5 px-4">
                    {doc.receiver_name} ({doc.receiver_tax_condition})
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs">
                    {doc.cae ?? '—'}
                  </td>
                  <td className="py-3.5 pl-4 text-right font-semibold">
                    {formatArs(doc.amount_centavos)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

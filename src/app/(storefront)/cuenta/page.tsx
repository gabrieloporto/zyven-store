import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentProfile, hasAdminPrivileges } from '@/lib/security/auth-guards';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatArs } from '@/lib/money';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { signOutAction } from '@/modules/customers/actions';

export default async function AccountPage() {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect('/login?next=/cuenta');
  }

  const supabase = await createSupabaseServerClient();

  const [{ data: addresses }, { data: orders }] = await Promise.all([
    supabase
      .from('customer_addresses')
      .select('*')
      .eq('user_id', profile.id)
      .order('is_default', { ascending: false }),
    supabase
      .from('orders')
      .select('id, order_number, total_centavos, order_status, payment_status, shipping_status, created_at')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const isAdmin = hasAdminPrivileges(profile);

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-neutral-200 pb-6 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#111111]">Mi Cuenta</h1>
            {isAdmin ? <Badge variant="default">Administrador</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-neutral-600">
            {profile.full_name || profile.email} ({profile.email})
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin ? (
            <Button asChild variant="dark">
              <Link href="/admin">Ir al Panel Admin</Link>
            </Button>
          ) : null}
          <form
            action={async () => {
              'use server';
              await signOutAction();
              redirect('/');
            }}
          >
            <Button type="submit" variant="outline">
              Cerrar sesión
            </Button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Datos personales y direcciones */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-neutral-200 bg-white p-6">
            <h2 className="text-lg font-bold text-[#111111]">Datos Personales</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div>
                <dt className="text-neutral-500">Nombre</dt>
                <dd className="font-medium text-[#111111]">
                  {profile.full_name || 'Sin completar'}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Teléfono</dt>
                <dd className="font-medium text-[#111111]">
                  {profile.phone || 'Sin completar'}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Documento</dt>
                <dd className="font-medium text-[#111111]">
                  {profile.document_number
                    ? `${profile.document_type ?? 'DNI'} ${profile.document_number}`
                    : 'Sin completar'}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-6">
            <h2 className="text-lg font-bold text-[#111111]">
              Mis Direcciones ({addresses?.length ?? 0})
            </h2>
            {!addresses || addresses.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-500">
                Todavía no tenés direcciones guardadas. Podrás guardar tu
                dirección al realizar tu primera compra.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {addresses.map((addr) => (
                  <li
                    key={addr.id}
                    className="rounded-xl border border-neutral-200 p-3.5 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#111111]">
                        {addr.label || addr.recipient_name}
                      </span>
                      {addr.is_default ? (
                        <Badge variant="violetSoft">Principal</Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-neutral-600">
                      {addr.street_name} {addr.street_number}
                      {addr.floor_apt ? `, ${addr.floor_apt}` : ''} —{' '}
                      {addr.locality}, {addr.province} (CP {addr.postal_code})
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Historial de compras */}
        <section className="rounded-2xl border border-neutral-200 bg-white p-6 lg:col-span-2">
          <h2 className="text-lg font-bold text-[#111111]">
            Mis Pedidos ({orders?.length ?? 0})
          </h2>

          {!orders || orders.length === 0 ? (
            <div className="mt-8 rounded-xl border border-dashed border-neutral-200 p-8 text-center">
              <p className="text-sm text-neutral-600">
                Todavía no realizaste pedidos con esta cuenta.
              </p>
              <Button asChild className="mt-4">
                <Link href="/productos">Explorar catálogo</Link>
              </Button>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-neutral-200 text-xs uppercase text-neutral-500">
                  <tr>
                    <th className="py-3 pr-4">Orden</th>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4">Pago</th>
                    <th className="py-3 pl-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td className="py-3.5 pr-4 font-mono font-semibold text-[#111111]">
                        {order.order_number}
                      </td>
                      <td className="py-3.5 px-4 text-neutral-600">
                        {new Date(order.created_at).toLocaleDateString('es-AR')}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="secondary">{order.order_status}</Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            order.payment_status === 'approved'
                              ? 'success'
                              : 'outline'
                          }
                        >
                          {order.payment_status}
                        </Badge>
                      </td>
                      <td className="py-3.5 pl-4 text-right font-semibold text-[#111111]">
                        {formatArs(order.total_centavos)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

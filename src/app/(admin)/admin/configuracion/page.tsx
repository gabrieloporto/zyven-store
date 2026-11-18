import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';

export default async function AdminSettingsPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: settings }, { data: carriers }] = await Promise.all([
    supabase.from('store_settings').select('*').eq('id', 1).maybeSingle(),
    supabase
      .from('shipping_carrier_configs')
      .select('*')
      .order('code', { ascending: true }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#111111]">
          Configuración del Negocio y Modos de Cumplimiento
        </h1>
        <p className="text-sm text-neutral-600">
          Parámetros operativos de Zyven Store y configuración de modos
          logísticos.
        </p>
      </div>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-bold text-[#111111]">
          Datos de Origen y Reserva
        </h2>
        <dl className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-neutral-500">Localidad y Partido</dt>
            <dd className="font-semibold text-[#111111]">
              {settings?.origin_locality ?? 'Alejandro Korn'},{' '}
              {settings?.origin_party ?? 'San Vicente'}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Provincia y Código Postal</dt>
            <dd className="font-semibold text-[#111111]">
              {settings?.origin_province ?? 'Buenos Aires'} (CP{' '}
              {settings?.origin_postal_code ?? '1864'})
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Vigencia Reserva de Stock</dt>
            <dd className="font-semibold text-[#111111]">
              {settings?.reservation_ttl_minutes ?? 30} minutos
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-bold text-[#111111]">
          Modos de Cumplimiento y Operadores Logísticos (Sección 10)
        </h2>
        <p className="mt-1 text-xs text-neutral-500">
          Los modos manuales permanecen deshabilitados inicialmente hasta
          definir ubicación, instrucciones, condiciones y costos.
        </p>

        <div className="mt-4 space-y-3">
          {(carriers ?? []).map((c) => (
            <div
              key={c.code}
              className="flex items-center justify-between rounded-xl border border-neutral-200 p-4 text-sm"
            >
              <div>
                <p className="font-bold text-[#111111]">{c.name}</p>
                <p className="text-xs text-neutral-500">
                  Código: <code>{c.code}</code> · Divisor volumétrico:{' '}
                  {c.volumetric_divisor}
                </p>
              </div>
              <Badge variant={c.is_enabled ? 'success' : 'secondary'}>
                {c.is_enabled ? 'Habilitado' : 'Deshabilitado'}
              </Badge>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

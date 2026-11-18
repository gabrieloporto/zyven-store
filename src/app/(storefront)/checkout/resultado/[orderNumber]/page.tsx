import Link from 'next/link';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { createSupabaseAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { formatArs } from '@/lib/money';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

/**
 * Página de retorno desde Mercado Pago Checkout Pro (Sección 9).
 * REGLA CRÍTICA DE SEGURIDAD:
 * Una URL de retorno exitosa (?status=approved) NUNCA se utiliza como prueba de pago aprobado.
 * Esta página lee exclusivamente el estado verificado en servidor desde nuestra base de datos.
 */
export default async function CheckoutResultPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;

  let order: {
    order_number: string;
    order_status: string;
    payment_status: string;
    total_centavos: number;
  } | null = null;

  if (isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from('orders')
      .select('order_number, order_status, payment_status, total_centavos')
      .eq('order_number', orderNumber)
      .maybeSingle();
    order = data;
  }

  const isApproved = order?.payment_status === 'approved';
  const isManualReview = order?.order_status === 'manual_review';

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-xs space-y-5">
        {isApproved && !isManualReview ? (
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
        ) : isManualReview ? (
          <AlertCircle className="mx-auto h-14 w-14 text-amber-600" />
        ) : (
          <Clock className="mx-auto h-14 w-14 text-[#7B19EC]" />
        )}

        <div>
          <Badge variant="violetSoft">Pedido {orderNumber}</Badge>
          <h1 className="mt-3 text-2xl font-bold text-[#111111]">
            {isApproved && !isManualReview
              ? '¡Pago confirmado por nuestro servidor!'
              : isManualReview
                ? 'Pago recibido — En revisión administrativa'
                : 'Verificando el estado de tu pago con Mercado Pago'}
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            {isApproved && !isManualReview
              ? 'Tu compra ya está confirmada y en preparación en nuestro depósito de Alejandro Korn.'
              : isManualReview
                ? 'Recibimos tu pago luego del vencimiento de la reserva temporal. Nuestro equipo revisará la disponibilidad o gestionará tu reembolso a la brevedad.'
                : 'Aguardamos la confirmación oficial (webhook) de Mercado Pago. Te enviaremos un correo electrónico apenas se acredite.'}
          </p>
        </div>

        {order ? (
          <div className="rounded-xl bg-neutral-50 p-4 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-neutral-500">Estado de pago real:</span>
              <span className="font-semibold text-[#111111]">
                {order.payment_status}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-neutral-500">Total de la orden:</span>
              <span className="font-bold text-[#7B19EC]">
                {formatArs(order.total_centavos)}
              </span>
            </div>
          </div>
        ) : null}

        <div className="flex justify-center gap-3 pt-2">
          <Button asChild variant="outline">
            <Link href="/cuenta">Ver mis pedidos</Link>
          </Button>
          <Button asChild>
            <Link href="/productos">Seguir comprando</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

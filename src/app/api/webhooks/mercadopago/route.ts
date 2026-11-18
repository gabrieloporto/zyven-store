import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { validateMercadoPagoWebhookSignature } from '@/modules/payments/webhook-validator';
import { fetchRealMercadoPagoPayment } from '@/modules/payments/mercadopago.service';
import type { Json } from '@/lib/supabase/database.types';

/**
 * Receptor de Webhooks de Mercado Pago (Secciones 9 y 16).
 * 1. Extrae `data.id` y valida la firma criptográfica HMAC-SHA256 (`x-signature`, `x-request-id`).
 * 2. Deduplica y registra el evento en `public.webhook_inbox`.
 * 3. Consulta el estado REAL del pago en `GET /v1/payments/{id}` desde Mercado Pago.
 * 4. Si está aprobado, ejecuta `process_approved_payment_atomic` (que distingue pago en término vs. Pago Tardío).
 */
export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    const dataObj = (body.data as Record<string, unknown> | undefined) ?? {};
    const dataId =
      url.searchParams.get('data.id') ??
      url.searchParams.get('id') ??
      (dataObj.id ? String(dataObj.id) : null);

    const topic =
      url.searchParams.get('type') ??
      url.searchParams.get('topic') ??
      (typeof body.type === 'string' ? body.type : 'payment');

    const xSignature = request.headers.get('x-signature');
    const xRequestId = request.headers.get('x-request-id');
    const webhookSecret = process.env.MP_WEBHOOK_SECRET ?? '';

    const sigValidation = validateMercadoPagoWebhookSignature({
      xSignatureHeader: xSignature,
      xRequestIdHeader: xRequestId,
      dataIdQueryParam: dataId,
      webhookSecret,
    });

    if (!sigValidation.valid) {
      return NextResponse.json(
        { error: sigValidation.reason ?? 'Firma de webhook inválida.' },
        { status: 401 }
      );
    }

    if (!dataId) {
      return NextResponse.json(
        { received: true, ignored: 'missing_data_id' },
        { status: 200 }
      );
    }

    const admin = createSupabaseAdminClient();
    const action = typeof body.action === 'string' ? body.action : 'notification';
    const dedupKey = `mp:${topic}:${dataId}:${action}:${xRequestId ?? 'no-req-id'}`;

    const { data: inboxRow, error: inboxErr } = await admin
      .from('webhook_inbox')
      .upsert(
        {
          provider: 'mercadopago',
          dedup_key: dedupKey,
          topic,
          resource_id: dataId,
          signature_valid: true,
          headers: {
            'x-signature': xSignature,
            'x-request-id': xRequestId,
          } as unknown as Json,
          payload: body as unknown as Json,
          status: 'processing',
        },
        { onConflict: 'dedup_key' }
      )
      .select('id, status, processed_at')
      .single();

    if (inboxErr || !inboxRow) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    if (inboxRow.processed_at) {
      return NextResponse.json(
        { received: true, deduplicated: true },
        { status: 200 }
      );
    }

    if (topic === 'payment') {
      const realPayment = await fetchRealMercadoPagoPayment(dataId);

      if (realPayment.externalReference) {
        if (realPayment.status === 'approved') {
          await admin.rpc('process_approved_payment_atomic', {
            p_order_id: realPayment.externalReference,
            p_mp_payment_id: realPayment.mpPaymentId,
            p_mp_preference_id: '',
            p_mp_merchant_order_id: realPayment.merchantOrderId ?? '',
            p_amount_centavos: realPayment.amountCentavos,
            p_payment_method_id: realPayment.paymentMethodId ?? '',
            p_payment_type_id: realPayment.paymentTypeId ?? '',
            p_installments: realPayment.installments,
            p_raw_response: realPayment.rawResponse as unknown as Json,
          });
        } else if (
          realPayment.status === 'rejected' ||
          realPayment.status === 'cancelled'
        ) {
          await admin
            .from('orders')
            .update({ payment_status: realPayment.status })
            .eq('id', realPayment.externalReference);
        }
      }
    }

    await admin
      .from('webhook_inbox')
      .update({
        status: 'processed',
        processed_at: new Date().toISOString(),
      })
      .eq('id', inboxRow.id);

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Error procesando notificación webhook.',
      },
      { status: 500 }
    );
  }
}

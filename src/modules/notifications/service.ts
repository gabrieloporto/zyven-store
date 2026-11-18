import 'server-only';
import { Resend } from 'resend';
import { formatArs, type Centavos } from '@/lib/money';
import { ZYVEN_BRAND } from '@/lib/brand';

export type TransactionalEmailType =
  | 'order_confirmed'
  | 'payment_approved'
  | 'order_shipped'
  | 'order_cancelled'
  | 'refund_processed';

export interface TransactionalEmailPayload {
  type: TransactionalEmailType;
  to: string;
  buyerName: string;
  orderNumber: string;
  totalCentavos: Centavos;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  idempotencyKey: string;
}

export function buildTransactionalEmailContent(
  payload: TransactionalEmailPayload
): { subject: string; html: string } {
  const formattedTotal = formatArs(payload.totalCentavos);

  const titles: Record<TransactionalEmailType, string> = {
    order_confirmed: `Recibimos tu pedido ${payload.orderNumber}`,
    payment_approved: `Pago acreditado — Pedido ${payload.orderNumber}`,
    order_shipped: `¡Tu pedido ${payload.orderNumber} está en camino!`,
    order_cancelled: `Pedido ${payload.orderNumber} cancelado`,
    refund_processed: `Reembolso confirmado — Pedido ${payload.orderNumber}`,
  };

  const messages: Record<TransactionalEmailType, string> = {
    order_confirmed:
      'Registramos tu orden y reservamos tu stock temporalmente mientras se confirma el pago.',
    payment_approved:
      'Tu pago fue confirmado por Mercado Pago. Ya estamos preparando tu pedido en nuestro depósito de Alejandro Korn.',
    order_shipped: payload.trackingNumber
      ? `Despachamos tu compra. Tu código de seguimiento es: <strong>${payload.trackingNumber}</strong>.`
      : 'Tu pedido fue despachado.',
    order_cancelled:
      'Tu pedido fue cancelado y la reserva de stock fue liberada.',
    refund_processed: `Procesamos un reembolso por ${formattedTotal} a través de Mercado Pago.`,
  };

  const subject = `${titles[payload.type]} | ${ZYVEN_BRAND.name}`;
  const html = `
    <!DOCTYPE html>
    <html lang="es-AR">
      <body style="margin:0;padding:24px;background-color:#F6F6F8;font-family:Montserrat,Arial,sans-serif;color:#111111;">
        <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #E4E4E7;border-radius:12px;overflow:hidden;">
          <div style="background:#111111;padding:20px 24px;border-bottom:3px solid #7B19EC;">
            <strong style="color:#FFFFFF;font-size:18px;letter-spacing:0.5px;">ZYVEN <span style="color:#7B19EC;">STORE</span></strong>
          </div>
          <div style="padding:24px;">
            <h1 style="margin:0 0 12px;font-size:20px;color:#111111;">Hola ${payload.buyerName},</h1>
            <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#3F3F46;">
              ${messages[payload.type]}
            </p>
            <div style="background:#F8F8FA;border:1px solid #E4E4E7;border-radius:8px;padding:16px;margin-bottom:20px;">
              <p style="margin:0 0 6px;font-size:13px;color:#52525B;">Orden: <strong>${payload.orderNumber}</strong></p>
              <p style="margin:0;font-size:15px;color:#111111;">Importe: <strong>${formattedTotal}</strong></p>
            </div>
            <p style="margin:0;font-size:12px;color:#71717A;">
              ${ZYVEN_BRAND.name} — ${ZYVEN_BRAND.location.locality}, ${ZYVEN_BRAND.location.province} (CP ${ZYVEN_BRAND.location.postalCode}), ${ZYVEN_BRAND.location.country}.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  return { subject, html };
}

/**
 * Envía un email transaccional mediante el plan gratuito de Resend utilizando
 * `Idempotency-Key` para impedir correos duplicados ante reintentos del Outbox (Sección 15).
 */
export async function sendTransactionalEmailIdempotent(
  payload: TransactionalEmailPayload
): Promise<{ sent: boolean; emailId?: string; skippedReason?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { sent: false, skippedReason: 'RESEND_API_KEY_NOT_CONFIGURED' };
  }

  const resend = new Resend(apiKey);
  const from =
    process.env.EMAIL_FROM ?? 'Zyven Store <no-reply@zyvenstore.com.ar>';
  const { subject, html } = buildTransactionalEmailContent(payload);

  const { data, error } = await resend.emails.send(
    {
      from,
      to: payload.to,
      subject,
      html,
    },
    {
      idempotencyKey: payload.idempotencyKey,
    }
  );

  if (error) {
    throw new Error(`Error Resend: ${error.message}`);
  }

  return { sent: true, emailId: data?.id };
}

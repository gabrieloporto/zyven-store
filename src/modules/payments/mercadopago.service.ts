import 'server-only';
import { MercadoPagoConfig, Preference, Payment, PaymentRefund } from 'mercadopago';
import { centavosToPesosNumber, pesosToCentavos, type Centavos } from '@/lib/money';
import { AppError } from '@/lib/errors';

function getMpClient(): MercadoPagoConfig {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    throw new AppError({
      code: 'PAYMENT_PROVIDER_ERROR',
      message: 'Falta configurar MP_ACCESS_TOKEN en el servidor.',
    });
  }
  return new MercadoPagoConfig({
    accessToken,
    options: { timeout: 10_000 },
  });
}

export interface CreateCheckoutProPreferenceParams {
  orderId: string;
  orderNumber: string;
  buyerEmail: string;
  buyerFullName: string;
  items: ReadonlyArray<{
    id: string;
    title: string;
    sku: string;
    quantity: number;
    unitPriceCentavos: Centavos;
  }>;
  shippingCentavos: Centavos;
  reservationExpiresAtIso: string;
  idempotencyKey: string;
}

/**
 * Crea una preferencia de pago de Checkout Pro desde el backend vinculada a la orden (Sección 9).
 */
export async function createCheckoutProPreference(
  params: CreateCheckoutProPreferenceParams
): Promise<{
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint: string | null;
}> {
  const client = getMpClient();
  const preference = new Preference(client);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const mpItems = params.items.map((item) => ({
    id: item.sku,
    title: item.title,
    quantity: item.quantity,
    currency_id: 'ARS',
    unit_price: centavosToPesosNumber(item.unitPriceCentavos),
  }));

  if (params.shippingCentavos > 0) {
    mpItems.push({
      id: 'ENVIO',
      title: 'Costo de envío',
      quantity: 1,
      currency_id: 'ARS',
      unit_price: centavosToPesosNumber(params.shippingCentavos),
    });
  }

  const response = await preference.create({
    body: {
      external_reference: params.orderId,
      statement_descriptor: 'ZYVEN STORE',
      payer: {
        name: params.buyerFullName,
        email: params.buyerEmail,
      },
      items: mpItems,
      back_urls: {
        success: `${appUrl}/checkout/resultado/${params.orderNumber}`,
        pending: `${appUrl}/checkout/resultado/${params.orderNumber}`,
        failure: `${appUrl}/checkout/resultado/${params.orderNumber}`,
      },
      auto_return: 'approved',
      notification_url: `${appUrl}/api/webhooks/mercadopago`,
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: params.reservationExpiresAtIso,
      metadata: {
        order_id: params.orderId,
        order_number: params.orderNumber,
      },
    },
    requestOptions: {
      idempotencyKey: params.idempotencyKey,
    },
  });

  if (!response.id || !response.init_point) {
    throw new AppError({
      code: 'PAYMENT_PROVIDER_ERROR',
      message: 'Mercado Pago no devolvió un init_point válido para la preferencia.',
    });
  }

  return {
    preferenceId: response.id,
    initPoint: response.init_point,
    sandboxInitPoint: response.sandbox_init_point ?? null,
  };
}

/**
 * Consulta directamente el estado real de un pago en la API de Mercado Pago.
 * NUNCA se confía únicamente en los parámetros de la URL de retorno ni en el body del webhook.
 */
export async function fetchRealMercadoPagoPayment(mpPaymentId: string): Promise<{
  mpPaymentId: string;
  externalReference: string | null;
  status: string;
  statusDetail: string | null;
  amountCentavos: Centavos;
  paymentMethodId: string | null;
  paymentTypeId: string | null;
  installments: number;
  merchantOrderId: string | null;
  rawResponse: Record<string, unknown>;
}> {
  const client = getMpClient();
  const payment = new Payment(client);

  const data = await payment.get({ id: mpPaymentId });

  if (!data || !data.id) {
    throw new AppError({
      code: 'NOT_FOUND',
      message: `Pago ${mpPaymentId} no encontrado en Mercado Pago.`,
    });
  }

  return {
    mpPaymentId: String(data.id),
    externalReference: data.external_reference ?? null,
    status: data.status ?? 'pending',
    statusDetail: data.status_detail ?? null,
    amountCentavos: pesosToCentavos(data.transaction_amount ?? 0),
    paymentMethodId: data.payment_method_id ?? null,
    paymentTypeId: data.payment_type_id ?? null,
    installments: data.installments ?? 1,
    merchantOrderId: data.order?.id ? String(data.order.id) : null,
    rawResponse: data as unknown as Record<string, unknown>,
  };
}

/**
 * Ejecuta un reembolso total o parcial en Mercado Pago con clave de idempotencia (Secciones 9 y 13).
 * El reembolso solo se considera completado cuando Mercado Pago confirma `status === 'approved'`.
 */
export async function executeMercadoPagoRefund(params: {
  mpPaymentId: string;
  amountCentavos?: Centavos;
  idempotencyKey: string;
}): Promise<{
  mpRefundId: string;
  status: 'approved' | 'pending' | 'rejected';
  rawResponse: Record<string, unknown>;
}> {
  const client = getMpClient();
  const refundClient = new PaymentRefund(client);

  const body =
    params.amountCentavos != null
      ? { amount: centavosToPesosNumber(params.amountCentavos) }
      : {};

  const res = await refundClient.create({
    payment_id: params.mpPaymentId,
    body,
    requestOptions: {
      idempotencyKey: params.idempotencyKey,
    },
  });

  const normalizedStatus =
    res.status === 'approved'
      ? 'approved'
      : res.status === 'rejected'
        ? 'rejected'
        : 'pending';

  return {
    mpRefundId: String(res.id ?? ''),
    status: normalizedStatus,
    rawResponse: res as unknown as Record<string, unknown>,
  };
}

import 'server-only';
import crypto from 'crypto';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getCurrentProfile } from '@/lib/security/auth-guards';
import { getActiveCartDetailed } from '@/modules/cart/service';
import {
  customerAddressSchema,
  documentTypeSchema,
  argentineDocumentNumberSchema,
} from '@/modules/customers/schema';
import { validateShippingQuoteValidity } from '@/modules/shipping/packaging';
import { calculateOrderTotals } from '@/lib/money';
import { createCheckoutProPreference } from '@/modules/payments/mercadopago.service';
import { AppError } from '@/lib/errors';
import type { Json } from '@/lib/supabase/database.types';

export const checkoutSubmissionSchema = z.object({
  buyerFullName: z.string().trim().min(3).max(100),
  buyerEmail: z.string().trim().email(),
  buyerPhone: z.string().trim().min(8).max(25),
  buyerDocumentType: documentTypeSchema.default('DNI'),
  buyerDocumentNumber: argentineDocumentNumberSchema,
  shippingAddress: customerAddressSchema,
  shippingQuoteId: z.string().uuid('Seleccioná una opción de envío válida.'),
  customerNotes: z.string().trim().max(500).optional(),
  idempotencyKey: z.string().trim().min(8).max(120),
});

export type CheckoutSubmissionInput = z.infer<typeof checkoutSubmissionSchema>;

export function generateOrderAccessToken(orderNumber: string): string {
  const secret =
    process.env.ORDER_TOKEN_SECRET ?? 'dev-fallback-order-token-secret-zyven';
  return crypto
    .createHmac('sha256', secret)
    .update(`order-access:${orderNumber}`)
    .digest('hex');
}

export function verifyOrderAccessToken(
  orderNumber: string,
  token: string | null | undefined
): boolean {
  if (!token) return false;
  const expected = generateOrderAccessToken(orderNumber);
  const expectedBuf = Buffer.from(expected, 'utf8');
  const receivedBuf = Buffer.from(token, 'utf8');
  return (
    expectedBuf.byteLength === receivedBuf.byteLength &&
    crypto.timingSafeEqual(expectedBuf, receivedBuf)
  );
}

/**
 * Orquesta el Checkout completo en el servidor:
 * 1. Recalcula precios y stock vigentes desde la base de datos (nunca confía en el cliente).
 * 2. Verifica vigencia y fingerprint de la cotización de envío.
 * 3. Crea la orden con snapshots inmutables en `order_items`.
 * 4. Ejecuta la reserva atómica de stock en PostgreSQL (`reserve_stock_for_order_atomic`).
 * 5. Si el envío requiere cotización manual posterior (Sección 10), deja la orden en `pending_shipping_quote` sin crear preferencia de pago.
 * 6. Caso contrario, crea la preferencia de pago en Mercado Pago Checkout Pro.
 */
export async function processCheckoutServer(
  rawInput: CheckoutSubmissionInput
): Promise<{
  orderId: string;
  orderNumber: string;
  accessToken: string;
  requiresManualShippingQuote: boolean;
  checkoutUrl: string | null;
}> {
  const parsed = checkoutSubmissionSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError({
      code: 'VALIDATION_ERROR',
      message:
        parsed.error.issues[0]?.message ??
        'Revisá los datos del formulario de checkout.',
    });
  }

  const input = parsed.data;
  const cart = await getActiveCartDetailed();

  if (!cart.cartId || cart.items.length === 0) {
    throw new AppError({
      code: 'VALIDATION_ERROR',
      message: 'Tu carrito está vacío.',
    });
  }

  const admin = createSupabaseAdminClient();
  const profile = await getCurrentProfile();

  // 1. Obtener y verificar la cotización logística en base de datos
  const { data: quote, error: quoteErr } = await admin
    .from('shipping_quotes')
    .select('*')
    .eq('id', input.shippingQuoteId)
    .eq('cart_id', cart.cartId)
    .single();

  if (quoteErr || !quote) {
    throw new AppError({
      code: 'INVALID_SHIPPING_QUOTE',
      message: 'La cotización de envío seleccionada no existe o no pertenece a tu carrito.',
    });
  }

  validateShippingQuoteValidity({
    quote: {
      expiresAt: quote.expires_at,
      cartAndAddressFingerprint: quote.cart_and_address_fingerprint,
    },
    currentItems: cart.items.map((i) => ({
      variantId: i.variantId,
      quantity: i.quantity,
    })),
    currentPostalCode: input.shippingAddress.postalCode,
    currentProvince: input.shippingAddress.province,
  });

  // 2. Recalcular totales autoritativos en servidor
  const totals = calculateOrderTotals({
    items: cart.items.map((i) => ({
      unitPriceCentavos: i.unitPriceCentavos,
      quantity: i.quantity,
    })),
    shippingCentavos: quote.price_centavos,
  });

  const initialOrderStatus = quote.requires_manual_quote
    ? 'pending_shipping_quote'
    : 'pending_payment';
  const initialShippingStatus = quote.requires_manual_quote
    ? 'pending_quote'
    : 'ready_to_ship';

  // 3. Crear la orden
  const { data: order, error: orderErr } = await admin
    .from('orders')
    .insert({
      user_id: profile?.id ?? null,
      buyer_email: input.buyerEmail,
      buyer_full_name: input.buyerFullName,
      buyer_phone: input.buyerPhone,
      buyer_document_type: input.buyerDocumentType,
      buyer_document_number: input.buyerDocumentNumber,
      shipping_address_snapshot: input.shippingAddress as unknown as Json,
      delivery_modality: quote.delivery_modality,
      shipping_quote_snapshot: quote as unknown as Json,
      currency: 'ARS',
      subtotal_centavos: totals.subtotalCentavos,
      discount_centavos: totals.discountCentavos,
      shipping_centavos: totals.shippingCentavos,
      total_centavos: totals.totalCentavos,
      order_status: initialOrderStatus,
      payment_status: 'unpaid',
      fulfillment_status: 'unfulfilled',
      shipping_status: initialShippingStatus,
      billing_status: 'pending',
      customer_notes: input.customerNotes ?? null,
      idempotency_key: input.idempotencyKey,
    })
    .select('*')
    .single();

  if (orderErr || !order) {
    throw new AppError({
      code: 'CONFLICT',
      message: 'No se pudo generar la orden. Intentá nuevamente.',
    });
  }

  // 4. Insertar snapshots inmutables en order_items
  const orderItemsPayload = cart.items.map((item) => ({
    order_id: order.id,
    product_id: item.productId,
    variant_id: item.variantId,
    product_name_snapshot: item.productName,
    variant_title_snapshot: item.variantTitle,
    sku_snapshot: item.sku,
    quantity: item.quantity,
    unit_price_centavos: item.unitPriceCentavos,
    unit_discount_centavos: 0,
    line_total_centavos: item.lineTotalCentavos,
  }));

  const { error: itemsErr } = await admin
    .from('order_items')
    .insert(orderItemsPayload);

  if (itemsErr) {
    await admin.from('orders').delete().eq('id', order.id);
    throw new AppError({
      code: 'INTERNAL_ERROR',
      message: 'Error al registrar los artículos de la orden.',
    });
  }

  // 5. Ejecutar reserva atómica de stock en PostgreSQL (bloquea filas FOR UPDATE e impide sobreventas)
  const { data: reservationExpiresAt, error: reserveErr } = await admin.rpc(
    'reserve_stock_for_order_atomic',
    {
      p_order_id: order.id,
      p_ttl_minutes: 30,
    }
  );

  if (reserveErr || !reservationExpiresAt) {
    await admin.from('orders').delete().eq('id', order.id);
    const isInsufficient = reserveErr?.message?.includes('INSUFFICIENT_STOCK');
    throw new AppError({
      code: isInsufficient ? 'INSUFFICIENT_STOCK' : 'CONFLICT',
      message: isInsufficient
        ? 'Uno de los productos seleccionados acaba de quedarse sin stock disponible.'
        : 'No se pudo reservar el stock para tu compra.',
    });
  }

  // Registrar evento en Outbox
  await admin.from('outbox_events').insert({
    aggregate_type: 'order',
    aggregate_id: order.id,
    event_type: 'order.created',
    payload: {
      order_id: order.id,
      order_number: order.order_number,
      buyer_email: order.buyer_email,
      total_centavos: order.total_centavos,
    },
    idempotency_key: `order-created:${order.id}`,
  });

  const accessToken = generateOrderAccessToken(order.order_number);

  // Regla Sección 10: Cuando el envío requiere cotización manual posterior, NO generar preferencia de pago aún
  if (quote.requires_manual_quote) {
    return {
      orderId: order.id,
      orderNumber: order.order_number,
      accessToken,
      requiresManualShippingQuote: true,
      checkoutUrl: null,
    };
  }

  // 6. Crear preferencia de pago en Mercado Pago Checkout Pro si las credenciales están activas
  let checkoutUrl: string | null = null;

  if (process.env.MP_ACCESS_TOKEN) {
    const preference = await createCheckoutProPreference({
      orderId: order.id,
      orderNumber: order.order_number,
      buyerEmail: order.buyer_email,
      buyerFullName: order.buyer_full_name,
      items: cart.items.map((i) => ({
        id: i.variantId,
        title: `${i.productName} (${i.variantTitle})`,
        sku: i.sku,
        quantity: i.quantity,
        unitPriceCentavos: i.unitPriceCentavos,
      })),
      shippingCentavos: totals.shippingCentavos,
      reservationExpiresAtIso: reservationExpiresAt,
      idempotencyKey: `mp-pref:${order.id}`,
    });

    await admin.from('payments').insert({
      order_id: order.id,
      provider: 'mercadopago',
      mp_preference_id: preference.preferenceId,
      external_reference: order.id,
      status: 'pending',
      amount_centavos: totals.totalCentavos,
    });

    checkoutUrl = preference.initPoint;
  }

  return {
    orderId: order.id,
    orderNumber: order.order_number,
    accessToken,
    requiresManualShippingQuote: false,
    checkoutUrl,
  };
}

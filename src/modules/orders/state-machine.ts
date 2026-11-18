import { AppError } from '@/lib/errors';
import type { Database } from '@/lib/supabase/database.types';

export type OrderStatus = Database['public']['Enums']['order_status'];
export type PaymentStatus = Database['public']['Enums']['payment_status'];
export type FulfillmentStatus = Database['public']['Enums']['fulfillment_status'];
export type ShippingStatus = Database['public']['Enums']['shipping_status'];
export type BillingStatus = Database['public']['Enums']['billing_status'];

const ALLOWED_ORDER_TRANSITIONS: Record<OrderStatus, ReadonlyArray<OrderStatus>> = {
  pending_shipping_quote: ['pending_payment', 'cancelled'],
  pending_payment: ['confirmed', 'manual_review', 'cancelled'],
  manual_review: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['completed', 'cancelled'],
  completed: [],
  cancelled: ['manual_review'], // Si una orden cancelada por expiración recibe un pago tardío -> pasa a manual_review
};

const ALLOWED_FULFILLMENT_TRANSITIONS: Record<
  FulfillmentStatus,
  ReadonlyArray<FulfillmentStatus>
> = {
  unfulfilled: ['on_hold', 'ready_to_pick'],
  on_hold: ['ready_to_pick', 'unfulfilled'],
  ready_to_pick: ['packed', 'on_hold'],
  packed: ['fulfilled', 'on_hold'],
  fulfilled: ['returned'],
  returned: [],
};

const ALLOWED_BILLING_TRANSITIONS: Record<
  BillingStatus,
  ReadonlyArray<BillingStatus>
> = {
  pending: ['partially_invoiced', 'invoiced'],
  partially_invoiced: ['invoiced', 'pending'],
  invoiced: ['partially_invoiced', 'pending'], // En caso de nota de crédito parcial o total
};

export function assertValidOrderStatusTransition(
  from: OrderStatus,
  to: OrderStatus
): void {
  if (from === to) return;
  const allowed = ALLOWED_ORDER_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new AppError({
      code: 'CONFLICT',
      message: `Transición de estado de orden inválida: "${from}" -> "${to}".`,
    });
  }
}

export function assertValidFulfillmentStatusTransition(
  from: FulfillmentStatus,
  to: FulfillmentStatus
): void {
  if (from === to) return;
  const allowed = ALLOWED_FULFILLMENT_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new AppError({
      code: 'CONFLICT',
      message: `Transición de estado de preparación inválida: "${from}" -> "${to}".`,
    });
  }
}

export function assertValidBillingStatusTransition(
  from: BillingStatus,
  to: BillingStatus
): void {
  if (from === to) return;
  const allowed = ALLOWED_BILLING_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new AppError({
      code: 'CONFLICT',
      message: `Transición de estado de facturación inválida: "${from}" -> "${to}".`,
    });
  }
}

/**
 * Calcula el estado de facturación (`pending`, `partially_invoiced`, `invoiced`)
 * de forma independiente al estado de pago (Sección 12).
 */
export function resolveBillingStatusFromDocuments(params: {
  orderTotalCentavos: number;
  documents: ReadonlyArray<{
    documentType: string;
    amountCentavos: number;
    status: string;
  }>;
}): BillingStatus {
  let netInvoicedCentavos = 0;

  for (const doc of params.documents) {
    if (doc.status !== 'valid') continue;
    if (doc.documentType.startsWith('NOTA_CREDITO')) {
      netInvoicedCentavos -= doc.amountCentavos;
    } else {
      netInvoicedCentavos += doc.amountCentavos;
    }
  }

  if (netInvoicedCentavos <= 0) {
    return 'pending';
  }
  if (netInvoicedCentavos < params.orderTotalCentavos) {
    return 'partially_invoiced';
  }
  return 'invoiced';
}

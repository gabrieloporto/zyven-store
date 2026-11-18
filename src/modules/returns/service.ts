import 'server-only';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { requireAdminProfile } from '@/lib/security/auth-guards';
import { recordAuditLog } from '@/modules/admin/audit.service';
import { executeMercadoPagoRefund } from '@/modules/payments/mercadopago.service';
import { AppError } from '@/lib/errors';

export const inspectionItemDecisionSchema = z.object({
  returnItemId: z.string().uuid(),
  quantityReceived: z.number().int().min(0),
  quantityApprovedRestock: z.number().int().min(0),
  inspectionCondition: z.enum([
    'sealed_resellable',
    'opened_damaged',
    'defective_supplier',
  ]),
});

export type InspectionItemDecision = z.infer<
  typeof inspectionItemDecisionSchema
>;

/**
 * Regla pura de negocio (Sección 13):
 * El stock devuelto SOLO puede reponerse después de recibir (`received` / `inspected`)
 * e inspeccionar la mercadería como apta para la venta (`sealed_resellable`).
 */
export function calculateEligibleRestockQuantity(params: {
  returnStatus: string;
  quantityReceived: number;
  quantityApprovedRestock: number;
  inspectionCondition: 'pending' | 'sealed_resellable' | 'opened_damaged' | 'defective_supplier';
  alreadyRestocked: boolean;
}): number {
  if (params.alreadyRestocked) return 0;

  if (params.returnStatus !== 'received' && params.returnStatus !== 'inspected') {
    throw new AppError({
      code: 'CONFLICT',
      message:
        'No se puede reponer stock de una devolución antes de registrar la recepción e inspección física de la mercadería.',
    });
  }

  if (params.quantityApprovedRestock > params.quantityReceived) {
    throw new AppError({
      code: 'VALIDATION_ERROR',
      message:
        'La cantidad aprobada para reingreso a stock no puede superar la cantidad físicamente recibida.',
    });
  }

  if (params.inspectionCondition !== 'sealed_resellable') {
    return 0;
  }

  return params.quantityApprovedRestock;
}

/**
 * Ejecuta la inspección administrativa de una devolución y repone el stock únicamente
 * de las unidades verificadas como aptas (`sealed_resellable`), dejando registro en `inventory_movements` y `audit_logs`.
 */
export async function completeReturnInspectionAndRestockServer(params: {
  returnRequestId: string;
  inspectionNotes: string;
  decisions: ReadonlyArray<InspectionItemDecision>;
}): Promise<{ totalRestockedUnits: number }> {
  const adminProfile = await requireAdminProfile();
  const admin = createSupabaseAdminClient();

  const { data: returnReq, error: reqErr } = await admin
    .from('return_requests')
    .select('*')
    .eq('id', params.returnRequestId)
    .single();

  if (reqErr || !returnReq) {
    throw new AppError({
      code: 'NOT_FOUND',
      message: 'Solicitud de devolución no encontrada.',
    });
  }

  if (
    returnReq.status !== 'authorized' &&
    returnReq.status !== 'received' &&
    returnReq.status !== 'inspected'
  ) {
    throw new AppError({
      code: 'CONFLICT',
      message: `La devolución debe estar autorizada o recibida antes de inspeccionarse (estado actual: ${returnReq.status}).`,
    });
  }

  let totalRestockedUnits = 0;

  for (const decision of params.decisions) {
    const { data: rItem } = await admin
      .from('return_items')
      .select('*')
      .eq('id', decision.returnItemId)
      .eq('return_request_id', params.returnRequestId)
      .single();

    if (!rItem) continue;

    const restockQty = calculateEligibleRestockQuantity({
      returnStatus: 'inspected',
      quantityReceived: decision.quantityReceived,
      quantityApprovedRestock: decision.quantityApprovedRestock,
      inspectionCondition: decision.inspectionCondition,
      alreadyRestocked: rItem.restocked,
    });

    let movementId: string | null = rItem.restocked_movement_id;

    if (restockQty > 0) {
      const { data: inv } = await admin
        .from('inventory_levels')
        .select('*')
        .eq('variant_id', rItem.variant_id)
        .single();

      if (inv) {
        const newOnHand = inv.on_hand + restockQty;

        const { data: mov } = await admin
          .from('inventory_movements')
          .insert({
            variant_id: rItem.variant_id,
            warehouse_id: inv.warehouse_id,
            movement_type: 'return_restock',
            quantity_delta: restockQty,
            on_hand_before: inv.on_hand,
            on_hand_after: newOnHand,
            reserved_before: inv.reserved,
            reserved_after: inv.reserved,
            reference_type: 'return_request',
            reference_id: params.returnRequestId,
            idempotency_key: `rma-restock:${rItem.id}`,
            reason: `Reingreso tras recepción e inspección aprobada (${returnReq.return_number})`,
            actor_user_id: adminProfile.id,
          })
          .select('id')
          .single();

        movementId = mov?.id ?? null;

        await admin
          .from('inventory_levels')
          .update({ on_hand: newOnHand })
          .eq('variant_id', rItem.variant_id);

        totalRestockedUnits += restockQty;
      }
    }

    await admin
      .from('return_items')
      .update({
        quantity_received: decision.quantityReceived,
        quantity_approved_restock: decision.quantityApprovedRestock,
        inspection_condition: decision.inspectionCondition,
        restocked: restockQty > 0 || rItem.restocked,
        restocked_movement_id: movementId,
      })
      .eq('id', rItem.id);
  }

  await admin
    .from('return_requests')
    .update({
      status: 'inspected',
      inspection_notes: params.inspectionNotes,
      inspected_by: adminProfile.id,
      inspected_at: new Date().toISOString(),
    })
    .eq('id', params.returnRequestId);

  await recordAuditLog({
    actorUserId: adminProfile.id,
    actorRole: adminProfile.role,
    action: 'return.inspected',
    entityType: 'return_request',
    entityId: params.returnRequestId,
    afterState: {
      status: 'inspected',
      totalRestockedUnits,
      inspectionNotes: params.inspectionNotes,
    },
  });

  return { totalRestockedUnits };
}

/**
 * Procesa un reembolso total o parcial contra Mercado Pago y solo lo marca como 'approved'
 * tras confirmar la operación con Mercado Pago (Sección 13).
 */
export async function processOrderRefundServer(params: {
  orderId: string;
  paymentId: string;
  amountCentavos: number;
  reason: string;
  returnRequestId?: string;
  idempotencyKey: string;
}): Promise<{ refundId: string; status: string }> {
  const adminProfile = await requireAdminProfile();
  const admin = createSupabaseAdminClient();

  const { data: payment, error: payErr } = await admin
    .from('payments')
    .select('*')
    .eq('id', params.paymentId)
    .eq('order_id', params.orderId)
    .single();

  if (payErr || !payment || !payment.mp_payment_id) {
    throw new AppError({
      code: 'NOT_FOUND',
      message: 'Pago aprobado de Mercado Pago no encontrado para esta orden.',
    });
  }

  const maxRefundable = payment.amount_centavos - payment.refunded_amount_centavos;
  if (params.amountCentavos <= 0 || params.amountCentavos > maxRefundable) {
    throw new AppError({
      code: 'VALIDATION_ERROR',
      message: `El importe a reembolsar supera el saldo reembolsable del pago (${maxRefundable / 100} ARS).`,
    });
  }

  const isFullRefund = params.amountCentavos === payment.amount_centavos;

  const mpResult = await executeMercadoPagoRefund({
    mpPaymentId: payment.mp_payment_id,
    amountCentavos: isFullRefund ? undefined : params.amountCentavos,
    idempotencyKey: params.idempotencyKey,
  });

  const { data: refundRow, error: refErr } = await admin
    .from('payment_refunds')
    .insert({
      payment_id: payment.id,
      order_id: params.orderId,
      return_request_id: params.returnRequestId ?? null,
      mp_refund_id: mpResult.mpRefundId || null,
      amount_centavos: params.amountCentavos,
      status: mpResult.status,
      reason: params.reason,
      idempotency_key: params.idempotencyKey,
      requested_by: adminProfile.id,
      confirmed_at:
        mpResult.status === 'approved' ? new Date().toISOString() : null,
      raw_response: mpResult.rawResponse as unknown as never,
    })
    .select('id')
    .single();

  if (refErr || !refundRow) {
    throw new AppError({
      code: 'CONFLICT',
      message: 'No se pudo registrar el reembolso en base de datos.',
    });
  }

  // Solamente actualizar saldos reembolsados cuando Mercado Pago confirma 'approved'
  if (mpResult.status === 'approved') {
    const newRefundedTotal =
      payment.refunded_amount_centavos + params.amountCentavos;
    const newPaymentStatus =
      newRefundedTotal >= payment.amount_centavos
        ? 'refunded'
        : 'partially_refunded';

    await admin
      .from('payments')
      .update({
        refunded_amount_centavos: newRefundedTotal,
        status: newPaymentStatus,
      })
      .eq('id', payment.id);

    await admin
      .from('orders')
      .update({ payment_status: newPaymentStatus })
      .eq('id', params.orderId);
  }

  await recordAuditLog({
    actorUserId: adminProfile.id,
    actorRole: adminProfile.role,
    action: 'payment.refund_executed',
    entityType: 'payment_refund',
    entityId: refundRow.id,
    afterState: {
      orderId: params.orderId,
      amountCentavos: params.amountCentavos,
      mpStatus: mpResult.status,
      mpRefundId: mpResult.mpRefundId,
    },
  });

  return {
    refundId: refundRow.id,
    status: mpResult.status,
  };
}

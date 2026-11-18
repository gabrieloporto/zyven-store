import { z } from 'zod';

export const manualAdjustmentTypeSchema = z.enum([
  'purchase_entry',
  'manual_adjustment_in',
  'manual_adjustment_out',
]);

export const inventoryAdjustmentSchema = z.object({
  variantId: z.string().uuid('Variante inválida.'),
  movementType: manualAdjustmentTypeSchema,
  quantity: z
    .number()
    .int('La cantidad debe ser un número entero.')
    .positive('La cantidad debe ser mayor a 0.')
    .max(10_000),
  reason: z
    .string()
    .trim()
    .min(4, 'Ingresá un motivo claro para la auditoría del movimiento.')
    .max(300),
  lowStockThreshold: z.number().int().min(0).max(1000).optional(),
  idempotencyKey: z.string().trim().min(8).max(120),
});

export type InventoryAdjustmentInput = z.infer<
  typeof inventoryAdjustmentSchema
>;

/**
 * Calcula el nuevo stock físico (on_hand) y valida que nunca quede por debajo del stock reservado.
 */
export function computeNewOnHandAfterAdjustment(params: {
  currentOnHand: number;
  currentReserved: number;
  movementType: z.infer<typeof manualAdjustmentTypeSchema>;
  quantity: number;
}): { quantityDelta: number; newOnHand: number } {
  const { currentOnHand, currentReserved, movementType, quantity } = params;

  const isOut = movementType === 'manual_adjustment_out';
  const quantityDelta = isOut ? -quantity : quantity;
  const newOnHand = currentOnHand + quantityDelta;

  if (newOnHand < 0) {
    throw new Error(
      `El ajuste dejaría el stock físico en negativo (${newOnHand}). Stock actual: ${currentOnHand}.`
    );
  }

  if (newOnHand < currentReserved) {
    throw new Error(
      `No se puede reducir el stock físico a ${newOnHand} porque existen ${currentReserved} unidades comprometidas en reservas activas.`
    );
  }

  return { quantityDelta, newOnHand };
}

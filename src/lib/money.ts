/**
 * Utilidades monetarias exactas para Zyven Store (ARS - Pesos Argentinos).
 *
 * REGLA ARQUITECTÓNICA:
 * Todos los importes internos se representan como números enteros en CENTAVOS de ARS
 * (ej. $ 250.000,00 ARS = 25_000_000 centavos) para evitar errores de punto flotante
 * en cálculos de carritos, descuentos, cuotas y reembolsos parciales.
 */

export type Centavos = number;

const arsWithoutDecimalsFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const arsWithDecimalsFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function assertValidCentavos(value: number, fieldName = 'amount'): void {
  if (!Number.isSafeInteger(value)) {
    throw new Error(
      `El campo monetario "${fieldName}" debe ser un entero seguro en centavos. Recibido: ${value}`
    );
  }
  if (value < 0) {
    throw new Error(
      `El campo monetario "${fieldName}" no puede ser negativo. Recibido: ${value}`
    );
  }
}

/**
 * Convierte un importe en Pesos Argentinos (ej. 250000 o 1250.50) a centavos enteros.
 */
export function pesosToCentavos(pesos: number): Centavos {
  if (!Number.isFinite(pesos) || pesos < 0) {
    throw new Error(`Importe en pesos inválido: ${pesos}`);
  }
  const centavos = Math.round(pesos * 100);
  assertValidCentavos(centavos, 'pesosToCentavos');
  return centavos;
}

/**
 * Convierte centavos enteros a valor numérico decimal en Pesos (ej. para enviar a Mercado Pago).
 */
export function centavosToPesosNumber(centavos: Centavos): number {
  assertValidCentavos(centavos, 'centavosToPesosNumber');
  return Number((centavos / 100).toFixed(2));
}

/**
 * Formatea centavos en formato monetario local argentino (ej. "$ 250.000" o "$ 12.500,50").
 */
export function formatArs(
  centavos: Centavos,
  options?: { alwaysShowDecimals?: boolean }
): string {
  assertValidCentavos(centavos, 'formatArs');
  const pesos = centavos / 100;
  const hasCents = centavos % 100 !== 0;

  if (options?.alwaysShowDecimals || hasCents) {
    return arsWithDecimalsFormatter.format(pesos);
  }
  return arsWithoutDecimalsFormatter.format(pesos);
}

/**
 * Calcula el precio efectivo vigente de una variante contemplando precio promocional y ventana de fechas.
 */
export function resolveEffectivePriceCentavos(params: {
  priceCentavos: Centavos;
  promotionalPriceCentavos?: Centavos | null;
  promoStartsAt?: Date | string | null;
  promoEndsAt?: Date | string | null;
  now?: Date;
}): {
  effectivePriceCentavos: Centavos;
  compareAtPriceCentavos: Centavos | null;
  discountPercentage: number | null;
  isPromoActive: boolean;
} {
  const {
    priceCentavos,
    promotionalPriceCentavos,
    promoStartsAt,
    promoEndsAt,
    now = new Date(),
  } = params;

  assertValidCentavos(priceCentavos, 'priceCentavos');

  if (
    promotionalPriceCentavos == null ||
    promotionalPriceCentavos <= 0 ||
    promotionalPriceCentavos >= priceCentavos
  ) {
    return {
      effectivePriceCentavos: priceCentavos,
      compareAtPriceCentavos: null,
      discountPercentage: null,
      isPromoActive: false,
    };
  }

  assertValidCentavos(promotionalPriceCentavos, 'promotionalPriceCentavos');

  const start = promoStartsAt ? new Date(promoStartsAt) : null;
  const end = promoEndsAt ? new Date(promoEndsAt) : null;

  if (start && now < start) {
    return {
      effectivePriceCentavos: priceCentavos,
      compareAtPriceCentavos: null,
      discountPercentage: null,
      isPromoActive: false,
    };
  }

  if (end && now > end) {
    return {
      effectivePriceCentavos: priceCentavos,
      compareAtPriceCentavos: null,
      discountPercentage: null,
      isPromoActive: false,
    };
  }

  const discountPercentage = Math.round(
    ((priceCentavos - promotionalPriceCentavos) / priceCentavos) * 100
  );

  return {
    effectivePriceCentavos: promotionalPriceCentavos,
    compareAtPriceCentavos: priceCentavos,
    discountPercentage,
    isPromoActive: true,
  };
}

/**
 * Calcula un descuento porcentual en centavos sin exceder el subtotal ni producir decimales.
 */
export function calculatePercentageDiscountCentavos(
  subtotalCentavos: Centavos,
  percentage: number,
  maxCapCentavos?: Centavos | null
): Centavos {
  assertValidCentavos(subtotalCentavos, 'subtotalCentavos');
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
    throw new Error(`Porcentaje de descuento inválido: ${percentage}`);
  }

  const rawDiscount = Math.round((subtotalCentavos * percentage) / 100);
  const capped =
    maxCapCentavos != null ? Math.min(rawDiscount, maxCapCentavos) : rawDiscount;
  return Math.min(capped, subtotalCentavos);
}

/**
 * Calcula los totales de una orden en servidor validando invariantes contables.
 */
export function calculateOrderTotals(params: {
  items: ReadonlyArray<{
    unitPriceCentavos: Centavos;
    unitDiscountCentavos?: Centavos;
    quantity: number;
  }>;
  orderLevelDiscountCentavos?: Centavos;
  shippingCentavos?: Centavos;
}): {
  subtotalCentavos: Centavos;
  discountCentavos: Centavos;
  shippingCentavos: Centavos;
  totalCentavos: Centavos;
} {
  const {
    items,
    orderLevelDiscountCentavos = 0,
    shippingCentavos = 0,
  } = params;

  assertValidCentavos(orderLevelDiscountCentavos, 'orderLevelDiscountCentavos');
  assertValidCentavos(shippingCentavos, 'shippingCentavos');

  let subtotalCentavos = 0;
  let itemDiscountsCentavos = 0;

  for (const item of items) {
    assertValidCentavos(item.unitPriceCentavos, 'unitPriceCentavos');
    const unitDiscount = item.unitDiscountCentavos ?? 0;
    assertValidCentavos(unitDiscount, 'unitDiscountCentavos');

    if (unitDiscount > item.unitPriceCentavos) {
      throw new Error(
        'El descuento unitario no puede superar el precio unitario del producto.'
      );
    }
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
      throw new Error(`Cantidad de ítem inválida: ${item.quantity}`);
    }

    subtotalCentavos += item.unitPriceCentavos * item.quantity;
    itemDiscountsCentavos += unitDiscount * item.quantity;
  }

  const netAfterItemDiscounts = subtotalCentavos - itemDiscountsCentavos;
  const boundedOrderDiscount = Math.min(
    orderLevelDiscountCentavos,
    netAfterItemDiscounts
  );

  const discountCentavos = itemDiscountsCentavos + boundedOrderDiscount;
  const totalCentavos = subtotalCentavos - discountCentavos + shippingCentavos;

  return {
    subtotalCentavos,
    discountCentavos,
    shippingCentavos,
    totalCentavos,
  };
}

import crypto from 'crypto';
import { isProductionEnvironment } from '@/lib/env';
import { AppError } from '@/lib/errors';
import { pesosToCentavos, type Centavos } from '@/lib/money';

export interface PackableCartItem {
  variantId: string;
  sku: string;
  quantity: number;
  weightGrams: number;
  heightCm: number;
  widthCm: number;
  depthCm: number;
  containsFlammableLiquid: boolean;
  containsLithiumBattery: boolean;
  lithiumBatteryType: 'none' | 'contained_in_equipment' | 'standalone_powerbank';
}

export interface CalculatedPackage {
  packageIndex: number;
  physicalWeightGrams: number;
  protectiveTareGrams: number;
  totalWeightGrams: number;
  heightCm: number;
  widthCm: number;
  depthCm: number;
  volumeCm3: number;
  volumetricWeightGrams: number;
  chargeableWeightGrams: number;
  containsFlammableLiquid: boolean;
  containsLithiumBattery: boolean;
  hasStandalonePowerbank: boolean;
}

export interface CarrierConfig {
  code: string;
  name: string;
  isEnabled: boolean;
  isManualMode: boolean;
  requiresManualQuote: boolean;
  allowsFlammableLiquidsGround: boolean;
  allowsLithiumBatteries: boolean;
  volumetricDivisor: number;
  maxPackageWeightGrams: number;
  fixedCostCentavos?: Centavos | null;
}

export interface ShippingQuoteOption {
  providerCode: string;
  serviceCode: string;
  serviceName: string;
  deliveryModality:
    | 'home_delivery'
    | 'branch_pickup'
    | 'personal_pickup'
    | 'manual_coordination';
  priceCentavos: Centavos;
  requiresManualQuote: boolean;
  estimatedDeliveryMinDays: number | null;
  estimatedDeliveryMaxDays: number | null;
  packagesSnapshot: CalculatedPackage[];
  cartAndAddressFingerprint: string;
  expiresAt: string;
}

/**
 * Calcula los paquetes físicos, dimensiones con embalaje protector, peso volumétrico
 * y separación en múltiples bultos cuando supera el peso máximo por caja (Sección 10).
 */
export function buildPackagesForCart(
  items: ReadonlyArray<PackableCartItem>,
  options?: {
    volumetricDivisor?: number;
    maxPackageWeightGrams?: number;
  }
): CalculatedPackage[] {
  if (items.length === 0) {
    throw new AppError({
      code: 'VALIDATION_ERROR',
      message: 'No se pueden calcular paquetes para un carrito vacío.',
    });
  }

  const volumetricDivisor = options?.volumetricDivisor ?? 5000;
  const maxPackageWeightGrams = options?.maxPackageWeightGrams ?? 25_000;

  // Expandir unidades individuales ordenadas de mayor a menor peso
  const units: Array<Omit<PackableCartItem, 'quantity'>> = [];
  for (const item of items) {
    for (let i = 0; i < item.quantity; i += 1) {
      units.push({
        variantId: item.variantId,
        sku: item.sku,
        weightGrams: Math.max(10, item.weightGrams),
        heightCm: Math.max(1, item.heightCm),
        widthCm: Math.max(1, item.widthCm),
        depthCm: Math.max(1, item.depthCm),
        containsFlammableLiquid: item.containsFlammableLiquid,
        containsLithiumBattery: item.containsLithiumBattery,
        lithiumBatteryType: item.lithiumBatteryType,
      });
    }
  }

  units.sort((a, b) => b.weightGrams - a.weightGrams);

  const buckets: Array<typeof units> = [];
  let currentBucket: typeof units = [];
  let currentBucketWeight = 0;

  for (const unit of units) {
    const unitWithTare =
      unit.weightGrams +
      (unit.containsFlammableLiquid || unit.containsLithiumBattery ? 150 : 80);

    if (
      currentBucket.length > 0 &&
      currentBucketWeight + unitWithTare > maxPackageWeightGrams
    ) {
      buckets.push(currentBucket);
      currentBucket = [unit];
      currentBucketWeight = unitWithTare;
    } else {
      currentBucket.push(unit);
      currentBucketWeight += unitWithTare;
    }
  }
  if (currentBucket.length > 0) {
    buckets.push(currentBucket);
  }

  return buckets.map((bucket, idx) => {
    const physicalWeightGrams = bucket.reduce((sum, u) => sum + u.weightGrams, 0);
    const containsFlammableLiquid = bucket.some((u) => u.containsFlammableLiquid);
    const containsLithiumBattery = bucket.some((u) => u.containsLithiumBattery);
    const hasStandalonePowerbank = bucket.some(
      (u) => u.lithiumBatteryType === 'standalone_powerbank'
    );

    // Tara de caja rígida + material absorbente/pluribol (mayor protección en perfumes y electrónica)
    const protectiveTareGrams =
      containsFlammableLiquid || containsLithiumBattery ? 250 : 150;
    const totalWeightGrams = physicalWeightGrams + protectiveTareGrams;

    const rawVolumeCm3 = bucket.reduce(
      (sum, u) => sum + u.heightCm * u.widthCm * u.depthCm,
      0
    );

    const maxWidth = Math.max(...bucket.map((u) => u.widthCm)) + 4;
    const maxDepth = Math.max(...bucket.map((u) => u.depthCm)) + 4;
    const stackedHeight = Math.max(
      Math.max(...bucket.map((u) => u.heightCm)) + 4,
      Math.ceil(rawVolumeCm3 / (maxWidth * maxDepth)) + 4
    );

    const volumeCm3 = Math.round(stackedHeight * maxWidth * maxDepth);
    // Regla volumétrica: (Alto x Ancho x Profundidad en cm / divisor) = kg -> * 1000 = gramos
    const volumetricWeightGrams = Math.ceil(
      (volumeCm3 / volumetricDivisor) * 1000
    );
    const chargeableWeightGrams = Math.max(
      totalWeightGrams,
      volumetricWeightGrams
    );

    return {
      packageIndex: idx + 1,
      physicalWeightGrams,
      protectiveTareGrams,
      totalWeightGrams,
      heightCm: Number(stackedHeight.toFixed(1)),
      widthCm: Number(maxWidth.toFixed(1)),
      depthCm: Number(maxDepth.toFixed(1)),
      volumeCm3,
      volumetricWeightGrams,
      chargeableWeightGrams,
      containsFlammableLiquid,
      containsLithiumBattery,
      hasStandalonePowerbank,
    };
  });
}

/**
 * Evalúa si un operador logístico admite los paquetes según restricciones de alcohol/inflamables y baterías de litio.
 */
export function evaluateCarrierRestrictions(params: {
  carrier: CarrierConfig;
  packages: ReadonlyArray<CalculatedPackage>;
  isAirService?: boolean;
}): { allowed: boolean; rejectionReason?: string } {
  const { carrier, packages, isAirService = false } = params;

  if (!carrier.isEnabled) {
    return {
      allowed: false,
      rejectionReason: `El operador ${carrier.name} se encuentra deshabilitado.`,
    };
  }

  const hasFlammable = packages.some((p) => p.containsFlammableLiquid);
  const hasLithium = packages.some((p) => p.containsLithiumBattery);

  if (hasFlammable && isAirService) {
    return {
      allowed: false,
      rejectionReason:
        'Los perfumes y líquidos inflamables tienen prohibido el transporte por vía aérea.',
    };
  }

  if (hasFlammable && !carrier.allowsFlammableLiquidsGround) {
    return {
      allowed: false,
      rejectionReason: `El operador ${carrier.name} no admite el despacho de perfumería / líquidos con alcohol.`,
    };
  }

  if (hasLithium && !carrier.allowsLithiumBatteries) {
    return {
      allowed: false,
      rejectionReason: `El operador ${carrier.name} no tiene habilitado el transporte de artículos con baterías de litio.`,
    };
  }

  return { allowed: true };
}

/**
 * Genera una huella criptográfica determinística del contenido del carrito y dirección de destino.
 * Permite rechazar en el checkout cualquier cotización que no corresponda al carrito o dirección actual (Sección 10).
 */
export function computeCartAndAddressFingerprint(params: {
  items: ReadonlyArray<{ variantId: string; quantity: number }>;
  postalCode: string;
  province: string;
}): string {
  const normalizedItems = [...params.items]
    .sort((a, b) => a.variantId.localeCompare(b.variantId))
    .map((i) => `${i.variantId}:${i.quantity}`)
    .join('|');

  const normalizedDestination = `${params.postalCode
    .trim()
    .toUpperCase()}::${params.province.trim().toLowerCase()}`;

  return crypto
    .createHash('sha256')
    .update(`${normalizedItems}@${normalizedDestination}`)
    .digest('hex');
}

export function validateShippingQuoteValidity(params: {
  quote: {
    expiresAt: string | Date;
    cartAndAddressFingerprint: string;
  };
  currentItems: ReadonlyArray<{ variantId: string; quantity: number }>;
  currentPostalCode: string;
  currentProvince: string;
  now?: Date;
}): void {
  const now = params.now ?? new Date();
  const expiresAt = new Date(params.quote.expiresAt);

  if (expiresAt <= now) {
    throw new AppError({
      code: 'EXPIRED_SHIPPING_QUOTE',
      message:
        'La cotización de envío venció. Por favor recotizá el envío antes de continuar.',
    });
  }

  const currentFingerprint = computeCartAndAddressFingerprint({
    items: params.currentItems,
    postalCode: params.currentPostalCode,
    province: params.currentProvince,
  });

  if (currentFingerprint !== params.quote.cartAndAddressFingerprint) {
    throw new AppError({
      code: 'INVALID_SHIPPING_QUOTE',
      message:
        'El carrito o la dirección de entrega cambiaron desde que se cotizó el envío. Por favor seleccioná nuevamente una opción de envío.',
    });
  }
}

/**
 * Proveedor logístico simulado EXCLUSIVO para ambientes de desarrollo y testing (Sección 10).
 * Es imposible habilitarlo en producción.
 */
export function quoteWithDevelopmentSimulator(params: {
  items: ReadonlyArray<PackableCartItem>;
  postalCode: string;
  province: string;
  locality: string;
}): ShippingQuoteOption[] {
  if (isProductionEnvironment()) {
    throw new AppError({
      code: 'INTERNAL_ERROR',
      message:
        'BLOQUEO DE SEGURIDAD: El simulador logístico está terminantemente prohibido en producción.',
    });
  }

  if (process.env.ENABLE_SHIPPING_SIMULATOR !== 'true') {
    return [];
  }

  const packages = buildPackagesForCart(params.items);
  const totalChargeableGrams = packages.reduce(
    (sum, p) => sum + p.chargeableWeightGrams,
    0
  );

  const isGbaOrCaba =
    params.province === 'Buenos Aires' ||
    params.province === 'Ciudad Autónoma de Buenos Aires';

  const baseHomePesos = isGbaOrCaba ? 6500 : 9800;
  const weightSurchargePesos = Math.ceil(totalChargeableGrams / 1000) * 900;
  const homePriceCentavos = pesosToCentavos(baseHomePesos + weightSurchargePesos);
  const branchPriceCentavos = pesosToCentavos(
    Math.round((baseHomePesos + weightSurchargePesos) * 0.75)
  );

  const fingerprint = computeCartAndAddressFingerprint({
    items: params.items.map((i) => ({
      variantId: i.variantId,
      quantity: i.quantity,
    })),
    postalCode: params.postalCode,
    province: params.province,
  });

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  return [
    {
      providerCode: 'simulated_dev',
      serviceCode: 'sim_ground_home',
      serviceName: 'Envío Terrestre a Domicilio (Simulador Dev)',
      deliveryModality: 'home_delivery',
      priceCentavos: homePriceCentavos,
      requiresManualQuote: false,
      estimatedDeliveryMinDays: isGbaOrCaba ? 2 : 4,
      estimatedDeliveryMaxDays: isGbaOrCaba ? 4 : 7,
      packagesSnapshot: packages,
      cartAndAddressFingerprint: fingerprint,
      expiresAt,
    },
    {
      providerCode: 'simulated_dev',
      serviceCode: 'sim_ground_branch',
      serviceName: 'Retiro en Sucursal de Correo (Simulador Dev)',
      deliveryModality: 'branch_pickup',
      priceCentavos: branchPriceCentavos,
      requiresManualQuote: false,
      estimatedDeliveryMinDays: isGbaOrCaba ? 2 : 3,
      estimatedDeliveryMaxDays: isGbaOrCaba ? 3 : 6,
      packagesSnapshot: packages,
      cartAndAddressFingerprint: fingerprint,
      expiresAt,
    },
  ];
}

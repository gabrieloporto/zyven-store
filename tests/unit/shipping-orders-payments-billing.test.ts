import crypto from 'crypto';
import { describe, expect, it } from 'vitest';
import {
  buildPackagesForCart,
  evaluateCarrierRestrictions,
  computeCartAndAddressFingerprint,
  validateShippingQuoteValidity,
} from '@/modules/shipping/packaging';
import {
  assertValidOrderStatusTransition,
  assertValidFulfillmentStatusTransition,
  resolveBillingStatusFromDocuments,
} from '@/modules/orders/state-machine';
import { validateMercadoPagoWebhookSignature } from '@/modules/payments/webhook-validator';
import { buildImmutableBillingStoragePath } from '@/modules/billing/service';
import { calculateEligibleRestockQuantity } from '@/modules/returns/service';
import { sanitizeTelemetryProperties } from '@/lib/observability/analytics';
import {
  encryptBackupPayload,
  decryptAndVerifyBackupPayload,
} from '@/lib/backup/crypto-archive';

describe('shipping, orders, payments, billing, returns & backup — Pruebas integrales de dominio', () => {
  it('calcula peso físico, tara protectora y peso volumétrico de paquetes', () => {
    const packages = buildPackagesForCart([
      {
        variantId: '11111111-1111-4111-8111-111111111111',
        sku: 'ZYV-PERF-JPG-ELIX-100',
        quantity: 2,
        weightGrams: 450,
        heightCm: 16,
        widthCm: 10,
        depthCm: 10,
        containsFlammableLiquid: true,
        containsLithiumBattery: false,
        lithiumBatteryType: 'none',
      },
    ]);

    expect(packages).toHaveLength(1);
    const pkg = packages[0]!;
    // 2 * 450g = 900g físicos + 250g de tara protectora para perfume = 1150g
    expect(pkg.physicalWeightGrams).toBe(900);
    expect(pkg.protectiveTareGrams).toBe(250);
    expect(pkg.totalWeightGrams).toBe(1150);
    expect(pkg.containsFlammableLiquid).toBe(true);
    expect(pkg.chargeableWeightGrams).toBeGreaterThanOrEqual(1150);
  });

  it('bloquea envíos aéreos para perfumes inflamables y valida permisos por operador (Sección 10)', () => {
    const packages = buildPackagesForCart([
      {
        variantId: '11111111-1111-4111-8111-111111111111',
        sku: 'ZYV-PERF-JPG-ELIX-100',
        quantity: 1,
        weightGrams: 450,
        heightCm: 15,
        widthCm: 10,
        depthCm: 10,
        containsFlammableLiquid: true,
        containsLithiumBattery: false,
        lithiumBatteryType: 'none',
      },
    ]);

    const carrierGroundOk = {
      code: 'carrier_ground',
      name: 'Operador Terrestre',
      isEnabled: true,
      isManualMode: false,
      requiresManualQuote: false,
      allowsFlammableLiquidsGround: true,
      allowsLithiumBatteries: true,
      volumetricDivisor: 5000,
      maxPackageWeightGrams: 25000,
    };

    // Por vía aérea siempre prohibido para perfumes inflamables
    expect(
      evaluateCarrierRestrictions({
        carrier: carrierGroundOk,
        packages,
        isAirService: true,
      }).allowed
    ).toBe(false);

    // Por vía terrestre con permiso explícito -> permitido
    expect(
      evaluateCarrierRestrictions({
        carrier: carrierGroundOk,
        packages,
        isAirService: false,
      }).allowed
    ).toBe(true);
  });

  it('rechaza cotizaciones logísticas vencidas o cuyo carrito/dirección fue modificado', () => {
    const items = [
      { variantId: '11111111-1111-4111-8111-111111111111', quantity: 1 },
    ];
    const fingerprint = computeCartAndAddressFingerprint({
      items,
      postalCode: '1864',
      province: 'Buenos Aires',
    });

    const now = new Date('2026-11-15T15:00:00Z');

    // Cotización vigente y coincidente -> OK
    expect(() =>
      validateShippingQuoteValidity({
        quote: {
          expiresAt: '2026-11-15T15:20:00Z',
          cartAndAddressFingerprint: fingerprint,
        },
        currentItems: items,
        currentPostalCode: '1864',
        currentProvince: 'Buenos Aires',
        now,
      })
    ).not.toThrow();

    // Cotización vencida -> lanza EXPIRED_SHIPPING_QUOTE
    expect(() =>
      validateShippingQuoteValidity({
        quote: {
          expiresAt: '2026-11-15T14:50:00Z',
          cartAndAddressFingerprint: fingerprint,
        },
        currentItems: items,
        currentPostalCode: '1864',
        currentProvince: 'Buenos Aires',
        now,
      })
    ).toThrow(/venció/);

    // Dirección cambiada a Córdoba -> lanza INVALID_SHIPPING_QUOTE
    expect(() =>
      validateShippingQuoteValidity({
        quote: {
          expiresAt: '2026-11-15T15:20:00Z',
          cartAndAddressFingerprint: fingerprint,
        },
        currentItems: items,
        currentPostalCode: '5000',
        currentProvince: 'Córdoba',
        now,
      })
    ).toThrow(/cambiaron/);
  });

  it('valida transiciones de los 5 ejes de estado de la orden e independencia de facturación', () => {
    // Pago tardío: pending_payment -> manual_review y cancelled -> manual_review son válidas
    expect(() =>
      assertValidOrderStatusTransition('pending_payment', 'manual_review')
    ).not.toThrow();
    expect(() =>
      assertValidOrderStatusTransition('cancelled', 'manual_review')
    ).not.toThrow();

    // Una orden completada no puede volver a pending_payment
    expect(() =>
      assertValidOrderStatusTransition('completed', 'pending_payment')
    ).toThrow();

    // Preparación bloqueada en on_hold puede liberarse a ready_to_pick tras revisión manual
    expect(() =>
      assertValidFulfillmentStatusTransition('on_hold', 'ready_to_pick')
    ).not.toThrow();

    // Facturación parcial vs total vs nota de crédito
    expect(
      resolveBillingStatusFromDocuments({
        orderTotalCentavos: 25_000_000,
        documents: [],
      })
    ).toBe('pending');

    expect(
      resolveBillingStatusFromDocuments({
        orderTotalCentavos: 25_000_000,
        documents: [
          {
            documentType: 'FACTURA_C',
            amountCentavos: 10_000_000,
            status: 'valid',
          },
        ],
      })
    ).toBe('partially_invoiced');

    expect(
      resolveBillingStatusFromDocuments({
        orderTotalCentavos: 25_000_000,
        documents: [
          {
            documentType: 'FACTURA_C',
            amountCentavos: 25_000_000,
            status: 'valid',
          },
        ],
      })
    ).toBe('invoiced');
  });

  it('valida firmas HMAC-SHA256 de webhooks de Mercado Pago y rechaza firmas adulteradas (Sección 9)', () => {
    const secret = 'mp-test-webhook-secret-zyven-2026';
    const dataId = 'ORD01JQ4S4KY8HWQ6NA5PXB65B3D3'; // Con mayúsculas para verificar normalización a minúsculas
    const requestId = 'req-abc-999';
    const nowMs = 1_763_240_000_000;
    const ts = String(nowMs);

    const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
    const validHmac = crypto
      .createHmac('sha256', secret)
      .update(manifest)
      .digest('hex');

    const okResult = validateMercadoPagoWebhookSignature({
      xSignatureHeader: `ts=${ts},v1=${validHmac}`,
      xRequestIdHeader: requestId,
      dataIdQueryParam: dataId,
      webhookSecret: secret,
      nowMs,
    });
    expect(okResult.valid).toBe(true);

    // Firma inválida / adulterada
    const forgedResult = validateMercadoPagoWebhookSignature({
      xSignatureHeader: `ts=${ts},v1=${'0'.repeat(64)}`,
      xRequestIdHeader: requestId,
      dataIdQueryParam: dataId,
      webhookSecret: secret,
      nowMs,
    });
    expect(forgedResult.valid).toBe(false);

    // Replay attack (timestamp de hace 2 horas)
    const expiredResult = validateMercadoPagoWebhookSignature({
      xSignatureHeader: `ts=${nowMs - 2 * 3600 * 1000},v1=${validHmac}`,
      xRequestIdHeader: requestId,
      dataIdQueryParam: dataId,
      webhookSecret: secret,
      nowMs,
    });
    expect(expiredResult.valid).toBe(false);
  });

  it('impide reponer stock en devoluciones antes de recibir e inspeccionar la mercadería (Sección 13)', () => {
    // Todavía en estado 'requested' -> lanza error si se intenta reponer stock
    expect(() =>
      calculateEligibleRestockQuantity({
        returnStatus: 'requested',
        quantityReceived: 1,
        quantityApprovedRestock: 1,
        inspectionCondition: 'sealed_resellable',
        alreadyRestocked: false,
      })
    ).toThrow(/recepción e inspección/);

    // Inspeccionado pero abierto/dañado -> devuelve 0 unidades a stock vendible
    expect(
      calculateEligibleRestockQuantity({
        returnStatus: 'inspected',
        quantityReceived: 1,
        quantityApprovedRestock: 1,
        inspectionCondition: 'opened_damaged',
        alreadyRestocked: false,
      })
    ).toBe(0);

    // Inspeccionado y sellado/apto -> repone la cantidad aprobada
    expect(
      calculateEligibleRestockQuantity({
        returnStatus: 'inspected',
        quantityReceived: 2,
        quantityApprovedRestock: 2,
        inspectionCondition: 'sealed_resellable',
        alreadyRestocked: false,
      })
    ).toBe(2);
  });

  it('genera rutas inmutables de comprobantes PDF y sanitiza PII en telemetría', () => {
    const path = buildImmutableBillingStoragePath({
      orderId: 'order-123',
      documentType: 'FACTURA_C',
      pointOfSale: 4,
      documentNumber: 158,
      fileSha256: 'abcdef1234567890abcdef1234567890',
    });
    expect(path).toBe('orders/order-123/FACTURA_C_00004-00000158_abcdef123456.pdf');

    const cleanProps = sanitizeTelemetryProperties({
      product_slug: 'jpg-le-male-elixir-edp-100ml',
      price_ars: 250000,
      password: 'secret',
      cuit: '20123456789',
      buyer_email: 'cliente@email.com',
      cae: '74123456789012',
    });
    expect(cleanProps).toEqual({
      product_slug: 'jpg-le-male-elixir-edp-100ml',
      price_ars: 250000,
    });
  });

  it('prueba de cifrado y restauración verificada de backup con AES-256-GCM (Sección 17)', () => {
    const sampleDump = Buffer.from(
      '-- PostgreSQL dump Zyven Store\nINSERT INTO public.orders (order_number) VALUES (\'ZYV-2026-001001\');',
      'utf8'
    );
    const key = 'clave-secreta-de-prueba-para-backup-zyven-2026';

    const encrypted = encryptBackupPayload(sampleDump, key);
    expect(encrypted.encryptedBuffer.equals(sampleDump)).toBe(false);

    const restored = decryptAndVerifyBackupPayload(
      encrypted.encryptedBuffer,
      key
    );
    expect(restored.sha256).toBe(encrypted.plaintextSha256);
    expect(restored.plaintext.toString('utf8')).toContain('ZYV-2026-001001');

    // Con clave incorrecta o archivo adulterado debe fallar la autenticación GCM
    expect(() =>
      decryptAndVerifyBackupPayload(
        encrypted.encryptedBuffer,
        'clave-incorrecta-1234567890'
      )
    ).toThrow();
  });
});
